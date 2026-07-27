/** Reproduces disconnect handling while editor mutations are in flight. */
import assert from "node:assert/strict";
import { rmSync, mkdtempSync } from "node:fs";
import { request as httpRequest, type ClientRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startEditorServer } from "../src/editor-server.js";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace } from "../src/workspace.js";
import { TEST_HTTP_SERVICE_TRANSPORT } from "./http-service-test-adapter.js";

test("a disconnected queued Zammad ticket request never reaches the remote API", async () => {
  const originalFetch = globalThis.fetch;
  const root = mkdtempSync(join(tmpdir(), "relution-editor-disconnect-"));
  const workspace = join(root, "workspace");
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Disconnected mutation",
    serverVersion: loadTemplateBundle().serverVersion,
  });

  let lookupStarted!: () => void;
  const lookupWasStarted = new Promise<void>((resolve) => { lookupStarted = resolve; });
  let releaseLookup!: () => void;
  const lookupRelease = new Promise<void>((resolve) => { releaseLookup = resolve; });
  let ticketPosts = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "zammad.example.test") return await originalFetch(input, init);
    if (url.pathname === "/api/v1/users/me") {
      lookupStarted();
      await lookupRelease;
      return new Response(JSON.stringify({ id: 1, login: "agent@example.test" }));
    }
    if (url.pathname === "/api/v1/tickets" && init?.method === "POST") {
      ticketPosts += 1;
      return new Response(JSON.stringify({ id: 99 }), { status: 201 });
    }
    throw new Error(`Unexpected Zammad test request: ${init?.method ?? "GET"} ${url.pathname}`);
  };

  let handle: Awaited<ReturnType<typeof startEditorServer>> | undefined;
  try {
    handle = await startEditorServer({
      workspace,
      key: "",
      out: join(root, "out.rexp"),
      port: 0,
      serviceTransport: TEST_HTTP_SERVICE_TRANSPORT,
    });
    const activeHandle = handle;
    const session = await postJson(activeHandle.url, activeHandle.apiToken, "/api/zammad/session", {
      host: "zammad.example.test",
      apiToken: "zammad-token",
      group: "IT",
      customer: "it@example.test",
    });
    assert.equal(session.status, 200, await session.text());

    const blockingRequest = postJson(activeHandle.url, activeHandle.apiToken, "/api/zammad/test", {});
    await lookupWasStarted;
    const disconnected = rawTicketRequest(activeHandle.url, activeHandle.apiToken);
    await waitFor(() => activeHandle.pendingMutationCount("zammad") === 2, "ticket request to enter the Zammad queue");
    const clientClosed = new Promise<void>((resolve) => disconnected.once("close", resolve));
    disconnected.destroy();
    await clientClosed;
    await waitFor(() => activeHandle.pendingMutationCount("zammad") === 1, "disconnected ticket request to leave the queue");

    releaseLookup();
    const testResponse = await blockingRequest;
    assert.equal(testResponse.status, 200, await testResponse.text());
    await waitFor(() => activeHandle.pendingMutationCount("zammad") === 0, "Zammad queue to drain");
    assert.equal(ticketPosts, 0);
  } finally {
    releaseLookup();
    await handle?.close();
    globalThis.fetch = originalFetch;
    rmSync(root, { recursive: true, force: true });
  }
});

function rawTicketRequest(baseUrl: string, apiToken: string): ClientRequest {
  const url = new URL("/api/zammad/tickets", baseUrl);
  const body = JSON.stringify({
    draft: {
      kind: "non-compliant-device",
      title: "Queued ticket",
      body: "This request must be cancelled before execution.",
      issueId: "missing-policy",
    },
  });
  const request = httpRequest({
    hostname: url.hostname,
    port: Number(url.port),
    path: url.pathname,
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
      "host": url.host,
      "origin": url.origin,
      "x-rexp-studio-token": apiToken,
    },
  });
  request.on("error", () => undefined);
  request.end(body);
  return request;
}

async function postJson(baseUrl: string, apiToken: string, path: string, value: unknown): Promise<Response> {
  return await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", "x-rexp-studio-token": apiToken },
    body: JSON.stringify(value),
  });
}

async function waitFor(predicate: () => boolean, description: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${description}`);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}
