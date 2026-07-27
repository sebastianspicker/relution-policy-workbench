/** Verifies idempotent Zammad operations under lock, retry, and failure cases. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";
import {
  createZammadTicket,
  findZammadTicketByOperationId,
  normalizeZammadConnection,
} from "../src/zammad-api.js";
import { ZammadTicketOperations, zammadTicketOperationId } from "../src/zammad-ticket-operations.js";
import { claimOperation, persistCompleted } from "../src/zammad-operation-store.js";
import { TEST_HTTP_SERVICE_TRANSPORT } from "./http-service-test-adapter.js";

const CONNECTION = normalizeZammadConnection({
  host: "zammad.example.test",
  apiToken: "secret-token",
  group: "IT",
  customer: "it@example.test",
});
const DRAFT = {
  kind: "non-compliant-device" as const,
  title: "Cross-process ticket",
  body: "Only one process may create this ticket.",
  issueId: "missing-policy",
};

test("independent processes atomically claim one Zammad ticket creation", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-processes-"));
  const counter = join(workspace, "posts.txt");
  try {
    await Promise.all([runOperationChild(workspace, counter), runOperationChild(workspace, counter)]);
    assert.equal(readFileSync(counter, "utf8"), "post\n");
    const operationFiles = readdirSync(join(workspace, ".rexp-studio-private", "zammad-ticket-operations"));
    assert.equal(operationFiles.length, 1);
    const record = JSON.parse(readFileSync(join(workspace, ".rexp-studio-private", "zammad-ticket-operations", operationFiles[0]!), "utf8")) as { state?: unknown };
    assert.equal(record.state, "completed");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("Zammad reconciliation verifies the exact marker in an internal ticket article", async () => {
  const originalFetch = globalThis.fetch;
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/tickets/search") {
      assert.equal(url.searchParams.get("per_page"), "10");
      return new Response(JSON.stringify([
        { id: 101, number: "240101" },
        { id: 102, number: "240102" },
        { number: "number-only" },
      ]));
    }
    if (url.pathname === "/api/v1/ticket_articles/by_ticket/101") {
      return new Response(JSON.stringify([{ internal: true, body: "unrelated article" }]));
    }
    assert.equal(url.pathname, "/api/v1/ticket_articles/by_ticket/102");
    return new Response(JSON.stringify([{ internal: true, body: `Finding\n[relution-operation:${operationId}]` }]));
  };
  try {
    const result = await findZammadTicketByOperationId(CONNECTION, operationId, TEST_HTTP_SERVICE_TRANSPORT);
    assert.equal(result?.id, 102);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad reconciliation rejects search hits without a verified internal marker", async () => {
  const originalFetch = globalThis.fetch;
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/tickets/search") {
      return new Response(JSON.stringify([{ id: 103, number: "240103" }]));
    }
    return new Response(JSON.stringify([
      { internal: false, body: `[relution-operation:${operationId}]` },
      { internal: true, body: "marker absent" },
    ]));
  };
  try {
    assert.equal(await findZammadTicketByOperationId(CONNECTION, operationId, TEST_HTTP_SERVICE_TRANSPORT), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad reconciliation requires an exact operation-marker line", async () => {
  const originalFetch = globalThis.fetch;
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/tickets/search") {
      return new Response(JSON.stringify([{ id: 104, number: "240104" }]));
    }
    return new Response(JSON.stringify([{ internal: true, body: `prefix [relution-operation:${operationId}] suffix` }]));
  };
  try {
    assert.equal(await findZammadTicketByOperationId(CONNECTION, operationId, TEST_HTTP_SERVICE_TRANSPORT), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad reconciliation refuses malformed operation IDs before querying the service", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("[]");
  };
  try {
    await assert.rejects(
      findZammadTicketByOperationId(CONNECTION, "relution-op-not-a-sha", TEST_HTTP_SERVICE_TRANSPORT),
      /Invalid Zammad operation id/u,
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad ticket-number validation is identical before and after persistence", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-number-"));
  const acceptedNumber = "7".repeat(256);
  globalThis.fetch = async () => new Response(JSON.stringify({ number: acceptedNumber }), { status: 201 });
  try {
    const created = await new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(CONNECTION, DRAFT);
    globalThis.fetch = async () => { throw new Error("persisted result must replay without a request"); };
    const replay = await new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(CONNECTION, DRAFT);
    assert.equal(created.number, acceptedNumber);
    assert.equal(replay.number, acceptedNumber);

    globalThis.fetch = async () => new Response(JSON.stringify({ number: "8".repeat(257) }), { status: 201 });
    await assert.rejects(
      createZammadTicket(CONNECTION, { ...DRAFT, title: "Oversized number" }, TEST_HTTP_SERVICE_TRANSPORT),
      /returned no ticket id or number/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("compatible completion identities merge atomically into the canonical record", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-identity-merge-"));
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  try {
    assert.equal(claimOperation(workspace, operationId).created, true);
    const first = persistCompleted(workspace, operationId, { id: 301, title: "Original ticket title", url: "ignored", raw: {} }, CONNECTION);
    const merged = persistCompleted(workspace, operationId, { id: 301, number: "240301", raw: {} }, CONNECTION);
    assert.equal(first.id, 301);
    assert.equal(first.title, "Original ticket title");
    assert.equal(merged.id, 301);
    assert.equal(merged.number, "240301");
    const file = join(workspace, ".rexp-studio-private", "zammad-ticket-operations", `${operationId}.json`);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")).result, { id: 301, number: "240301" });
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("completion rejects disjoint or contradictory ticket identifiers without replacing the record", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-identity-conflict-"));
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  try {
    assert.equal(claimOperation(workspace, operationId).created, true);
    persistCompleted(workspace, operationId, { id: 302, number: "240302", raw: {} }, CONNECTION);
    for (const result of [
      { id: 303, number: "240302", raw: {} },
      { id: 302, number: "240303", raw: {} },
    ]) {
      assert.throws(() => persistCompleted(workspace, operationId, result, CONNECTION), /conflicting ticket identifiers/u);
    }
    const file = join(workspace, ".rexp-studio-private", "zammad-ticket-operations", `${operationId}.json`);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")).result, { id: 302, number: "240302" });
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("completion rejects a number-only result against an id-only record", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-disjoint-identities-"));
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  try {
    assert.equal(claimOperation(workspace, operationId).created, true);
    persistCompleted(workspace, operationId, { id: 304, raw: {} }, CONNECTION);
    assert.throws(
      () => persistCompleted(workspace, operationId, { number: "240304", raw: {} }, CONNECTION),
      /conflicting ticket identifiers/u,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("Zammad operation-store enumeration has a hard aggregate entry bound", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-entry-bound-"));
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("{}");
  };
  try {
    const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
    const directory = join(workspace, ".rexp-studio-private", "zammad-ticket-operations");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    for (let index = 0; index < 288; index += 1) {
      const suffix = String(index).padStart(12, "0");
      writeFileSync(join(directory, `.${operationId}.json.00000000-0000-4000-8000-${suffix}.tmp`), "");
    }
    await assert.rejects(
      new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(CONNECTION, DRAFT),
      /operation store has no lock headroom within its 288 entry limit/u,
    );
    assert.equal(fetchCalled, false);
    assert.equal(readdirSync(directory).length, 288);
    assert.equal(readdirSync(directory).includes(".capacity.lock"), false);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("distinct processes cannot over-admit the final operation-store slot", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-capacity-processes-"));
  const counter = join(workspace, "posts.txt");
  const outcomes = join(workspace, "outcomes.txt");
  const release = join(workspace, "release");
  const directory = join(workspace, ".rexp-studio-private", "zammad-ticket-operations");
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    for (let index = 0; index < 255; index += 1) {
      const operationId = zammadTicketOperationId(CONNECTION, { ...DRAFT, title: `Existing uncertain operation ${String(index)}` });
      writeFileSync(join(directory, `${operationId}.json`), `${JSON.stringify({
        version: 1,
        id: operationId,
        state: "started",
        updatedAt: "2026-07-15T00:00:00.000Z",
      })}\n`, { mode: 0o600 });
    }

    const children = [
      runOperationChild(workspace, counter, { title: "Capacity contender A", outcomes, release }),
      runOperationChild(workspace, counter, { title: "Capacity contender B", outcomes, release }),
    ];
    try {
      const lines = await waitForLines(outcomes, 2);
      assert.deepEqual(lines.sort(), ["post", "rejected-503"]);
    } finally {
      writeFileSync(release, "release\n");
      await Promise.all(children);
    }

    assert.equal(readFileSync(counter, "utf8"), "post\n");
    const entries = readdirSync(directory);
    assert.equal(entries.length, 256);
    assert.equal(entries.includes(".capacity.lock"), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("completion refuses safely when crash leftovers consume its final atomic-write slot", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = mkdtempSync(join(tmpdir(), "relution-zammad-completion-headroom-"));
  const operationId = zammadTicketOperationId(CONNECTION, DRAFT);
  const directory = join(workspace, ".rexp-studio-private", "zammad-ticket-operations");
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/api/v1/tickets");
    assert.equal(init?.method, "POST");
    for (let index = 0; index < 286; index += 1) {
      const suffix = String(index).padStart(12, "0");
      writeFileSync(join(directory, `.${operationId}.json.00000000-0000-4000-8000-${suffix}.tmp`), "");
    }
    return new Response(JSON.stringify({ id: 200, number: "240200" }), { status: 201 });
  };
  try {
    await assert.rejects(
      new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(CONNECTION, DRAFT),
      (error: unknown) => typeof error === "object"
        && error !== null
        && "status" in error
        && error.status === 503
        && "message" in error
        && typeof error.message === "string"
        && error.message.includes("completion-write headroom"),
    );
    const entries = readdirSync(directory);
    assert.equal(entries.length, 287);
    assert.equal(entries.includes(".capacity.lock"), false);
    const record = JSON.parse(readFileSync(join(directory, `${operationId}.json`), "utf8")) as { state?: unknown };
    assert.equal(record.state, "started");
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

function runOperationChild(
  workspace: string,
  counter: string,
  options: { title?: string; outcomes?: string; release?: string } = {},
): Promise<void> {
  const childScript = fileURLToPath(new URL("./fixtures/zammad-operation-child.js", import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      childScript,
      workspace,
      counter,
      options.title ?? DRAFT.title,
      options.outcomes ?? "",
      options.release ?? "",
    ], { stdio: ["ignore", "ignore", "pipe"] });
    const errors: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer | string) => errors.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Zammad operation child failed (code=${String(code)}, signal=${String(signal)}): ${Buffer.concat(errors).toString("utf8")}`));
    });
  });
}

async function waitForLines(path: string, expectedCount: number): Promise<string[]> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const lines = readFileSync(path, "utf8").trim().split("\n").filter((line) => line.length > 0);
      if (lines.length >= expectedCount) return lines;
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${String(expectedCount)} child outcomes`);
}
