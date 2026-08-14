/** Covers Zammad API request shaping, pagination, and ticket error handling. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  normalizeZammadConnection,
  publicZammadSession,
  createZammadTicket as createZammadTicketWithTransport,
  testZammadConnection as testZammadConnectionWithTransport,
} from "../src/zammad-api.js";
import { handleZammadApiRequest } from "../src/zammad-editor-routes.js";
import { buildZammadTicketDraft } from "../src/zammad-ticket-drafts.js";
import { ZammadTicketOperations, zammadTicketOperationId } from "../src/zammad-ticket-operations.js";
import { TEST_HTTP_SERVICE_TRANSPORT } from "./http-service-test-adapter.js";

async function createZammadTicket(
  connection: Parameters<typeof createZammadTicketWithTransport>[0],
  draft: Parameters<typeof createZammadTicketWithTransport>[1],
) {
  return await createZammadTicketWithTransport(connection, draft, TEST_HTTP_SERVICE_TRANSPORT);
}

async function testZammadConnection(connection: Parameters<typeof testZammadConnectionWithTransport>[0]) {
  return await testZammadConnectionWithTransport(connection, TEST_HTTP_SERVICE_TRANSPORT);
}

test("normalizes Zammad connection settings without exposing the token publicly", () => {
  const connection = normalizeZammadConnection({
    host: "http://zammad.example.test:8080/helpdesk",
    apiToken: "secret-token",
    group: "IT",
    customer: "it@example.test",
    allowLocalServiceHosts: true,
  });

  assert.equal(connection.baseUrl, "http://zammad.example.test:8080/helpdesk");
  assert.deepEqual(publicZammadSession(connection), {
    configured: true,
    baseUrl: "http://zammad.example.test:8080/helpdesk",
    tokenConfigured: true,
    group: "IT",
    customer: "it@example.test",
  });
});

test("rejects cleartext Zammad connections without explicit local/lab opt-in", () => {
  assert.throws(
    () => normalizeZammadConnection({
      host: "http://zammad.example.test",
      apiToken: "secret-token",
      group: "IT",
      customer: "it@example.test",
    }),
    /HTTP connections require --allow-local-service-hosts/u,
  );
});

test("rejects Zammad API tokens with header control characters before an outbound request", () => {
  assert.throws(
    () => normalizeZammadConnection({
      host: "zammad.example.test",
      apiToken: "token\r\ninjected: value",
      group: "IT",
      customer: "it@example.test",
    }),
    /token must not contain control characters/u,
  );
});

test("builds non-compliant-device ticket drafts through the dispatcher", () => {
  const draft = buildZammadTicketDraft(
    {
      status: "issue",
      device: {
        uuid: "DEVICE-1",
        name: "Campus iPad",
        platform: "IOS",
        status: "COMPLIANT",
        policyStatus: "MISSING",
        assignedPolicies: ["Required baseline"],
        raw: {},
      },
      issues: [],
    },
    {
      id: "missing-policy",
      severity: "problem",
      message: "Required policy is missing.",
      evidence: { expectedPolicy: "Required baseline" },
    },
  );

  assert.equal(draft.kind, "non-compliant-device");
  assert.equal(draft.deviceUuid, "DEVICE-1");
  assert.equal(draft.issueId, "missing-policy");
  assert.match(draft.title, /Campus iPad/u);
  assert.match(draft.body, /Re-push the policy/u);
});

test("builds inactive-device ticket drafts with age-specific remediation", () => {
  const draft = buildZammadTicketDraft(
    {
      status: "issue",
      device: {
        uuid: "DEVICE-1",
        name: "Dorm iPad",
        platform: "IOS",
        status: "COMPLIANT",
        policyStatus: "APPLIED",
        inactiveDays: 95,
        raw: {},
      },
      issues: [],
    },
    {
      id: "inactive-problem",
      severity: "problem",
      message: "Device has not checked in for 95 days.",
      evidence: { inactiveDays: "95" },
    },
  );

  assert.equal(draft.kind, "inactive-device");
  assert.match(draft.title, /95d/u);
  assert.match(draft.body, /stale asset candidate/u);
});

test("Zammad connection test validates the current-user response body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://zammad.example.test/api/v1/users/me");
    assert.equal((init?.headers as Record<string, string>)["Authorization"], "Token token=secret-token");
    return new Response(JSON.stringify({ id: 7, login: "agent@example.test" }));
  };
  try {
    const result = await testZammadConnection(
      normalizeZammadConnection({
        host: "zammad.example.test",
        apiToken: "secret-token",
        group: "IT",
        customer: "it@example.test",
      }),
    );

    assert.deepEqual(result, { ok: true, baseUrl: "https://zammad.example.test" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad connection test returns a failure signal for malformed 200 responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "unauthorized" }));
  try {
    const result = await testZammadConnection(
      normalizeZammadConnection({
        host: "zammad.example.test",
        apiToken: "secret-token",
        group: "IT",
        customer: "it@example.test",
      }),
    );

    assert.deepEqual(result, {
      ok: false,
      baseUrl: "https://zammad.example.test",
      reason: "Zammad connection test returned an unexpected current-user response.",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad connection test rejects invalid numeric user IDs", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const id of [-1, 1.5, 0, Number.MAX_SAFE_INTEGER + 1]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ id, login: "agent@example.test" }));
      const result = await testZammadConnection(
        normalizeZammadConnection({
          host: "zammad.example.test",
          apiToken: "secret-token",
          group: "IT",
          customer: "it@example.test",
        }),
      );
      assert.equal(result.ok, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("creates Zammad tickets with token auth and internal note article", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://zammad.example.test/api/v1/tickets");
    assert.equal((init?.headers as Record<string, string>)["Authorization"], "Token token=secret-token");
    assert.match(String(init?.body), /"internal":true/u);
    assert.match(String(init?.body), /"type":"note"/u);
    return new Response(JSON.stringify({
      id: 42,
      number: "240042",
      title: "MDM non-compliance: Campus iPad",
      customer: { email: "must-not-reach-browser@example.test" },
    }), { status: 201 });
  };
  try {
    const ticket = await createZammadTicket(
      normalizeZammadConnection({
        host: "zammad.example.test",
        apiToken: "secret-token",
        group: "IT",
        customer: "it@example.test",
      }),
      {
        kind: "non-compliant-device",
        title: "MDM non-compliance: Campus iPad",
        body: "Finding body",
        deviceUuid: "DEVICE-1",
        issueId: "missing-policy",
      },
    );

    assert.equal(ticket.id, 42);
    assert.equal(ticket.number, "240042");
    assert.equal(ticket.url, "https://zammad.example.test/#ticket/zoom/42");
    assert.deepEqual(ticket.raw, {});
    assert.equal(JSON.stringify(ticket).includes("must-not-reach-browser"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts Zammad ticket creation when the response has an id but no number", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: 43, title: "ID-only ticket" }), { status: 201 });
  try {
    const ticket = await createZammadTicket(
      normalizeZammadConnection({
        host: "zammad.example.test",
        apiToken: "secret-token",
        group: "IT",
        customer: "it@example.test",
      }),
      {
        kind: "non-compliant-device",
        title: "ID-only ticket",
        body: "Finding body",
        issueId: "missing-policy",
      },
    );

    assert.equal(ticket.id, 43);
    assert.equal(ticket.number, undefined);
    assert.equal(ticket.url, "https://zammad.example.test/#ticket/zoom/43");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts Zammad ticket creation when the response has a number but no id", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ number: "240043", title: "Number-only ticket" }), { status: 201 });
  try {
    const ticket = await createZammadTicket(
      normalizeZammadConnection({
        host: "zammad.example.test",
        apiToken: "secret-token",
        group: "IT",
        customer: "it@example.test",
      }),
      {
        kind: "non-compliant-device",
        title: "Number-only ticket",
        body: "Finding body",
        issueId: "missing-policy",
      },
    );

    assert.equal(ticket.id, undefined);
    assert.equal(ticket.number, "240043");
    assert.equal(ticket.url, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects Zammad ticket creation responses with invalid numeric IDs", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const id of [-1, 1.5, 0, Number.MAX_SAFE_INTEGER + 1]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ id, number: "240043" }), { status: 201 });
      await assert.rejects(
        createZammadTicket(
          normalizeZammadConnection({
            host: "zammad.example.test",
            apiToken: "secret-token",
            group: "IT",
            customer: "it@example.test",
          }),
          {
            kind: "non-compliant-device",
            title: "Invalid ID ticket",
            body: "Finding body",
            issueId: "missing-policy",
          },
        ),
        /id that must be a positive safe integer/u,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects Zammad ticket creation responses without an addressable identifier", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 201 });
  try {
    await assert.rejects(
      createZammadTicket(
        normalizeZammadConnection({
          host: "zammad.example.test",
          apiToken: "secret-token",
          group: "IT",
          customer: "it@example.test",
        }),
        {
          kind: "non-compliant-device",
          title: "MDM non-compliance: Campus iPad",
          body: "Finding body",
          issueId: "missing-policy",
        },
      ),
      /no ticket id or number/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects empty Zammad ticket creation responses without claiming success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 201 });
  try {
    await assert.rejects(
      createZammadTicket(
        normalizeZammadConnection({
          host: "zammad.example.test",
          apiToken: "secret-token",
          group: "IT",
          customer: "it@example.test",
        }),
        {
          kind: "non-compliant-device",
          title: "MDM non-compliance: Campus iPad",
          body: "Finding body",
          issueId: "missing-policy",
        },
      ),
      /invalid JSON/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sanitizes failed Zammad API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    "secret-token Bearer unrelated-token it@example.test Campus iPad customer Alice",
    { status: 403, statusText: "Forbidden" },
  );
  try {
    await assert.rejects(
      createZammadTicket(
        normalizeZammadConnection({
          host: "zammad.example.test",
          apiToken: "secret-token",
          group: "IT",
          customer: "it@example.test",
        }),
        {
          kind: "non-compliant-device",
          title: "MDM non-compliance: Campus iPad",
          body: "Finding body",
          issueId: "missing-policy",
        },
      ),
      (error) => {
        assert.equal(error instanceof Error, true);
        const message = (error as Error).message;
        assert.equal(message, "Zammad API request failed: 403 Forbidden");
        assert.doesNotMatch(message, /secret-token/u);
        assert.doesNotMatch(message, /unrelated-token/u);
        assert.doesNotMatch(message, /it@example\.test/u);
        assert.doesNotMatch(message, /Campus iPad/u);
        assert.doesNotMatch(message, /Alice/u);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Zammad editor routes re-check outbound host policy before each request", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("{}");
  };
  try {
    await assert.rejects(
      handleZammadApiRequest(
        new URL("http://localhost/api/zammad/test"),
        { method: "POST" } as never,
        {} as never,
        {
          connection: normalizeZammadConnection({
            protocol: "http",
            host: "127.0.0.1",
            apiToken: "secret-token",
            group: "IT",
            customer: "it@example.test",
            allowLocalServiceHosts: true,
          }),
        },
        false,
      ),
      /blocked local\/private address/u,
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

export function zammadTestConnection() {
  return normalizeZammadConnection({
    host: "zammad.example.test",
    apiToken: "secret-token",
    group: "IT",
    customer: "it@example.test",
  });
}

export function zammadTestDraft() {
  return {
    kind: "non-compliant-device" as const,
    title: "MDM non-compliance: Campus iPad",
    body: "Finding body",
    deviceUuid: "DEVICE-1",
    issueId: "missing-policy",
  };
}

export function operationWorkspace(): string {
  return mkdtempSync(join(tmpdir(), "relution-zammad-operations-"));
}

test("Zammad operations issue one POST for identical retries and mark the internal article", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = operationWorkspace();
  let posts = 0;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://zammad.example.test/api/v1/tickets");
    assert.equal(init?.method, "POST");
    posts += 1;
    const body = JSON.parse(String(init?.body)) as { article: { body: string } };
    assert.match(body.article.body, /\[relution-operation:relution-op-[a-f0-9]{64}\]/u);
    return new Response(JSON.stringify({ id: 77, number: "240077" }), { status: 201 });
  };
  try {
    const operations = new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT);
    const connection = zammadTestConnection();
    const draft = zammadTestDraft();
    const first = await operations.create(connection, draft);
    const second = await operations.create(connection, draft);
    assert.equal(posts, 1);
    assert.deepEqual(second, first);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("an ambiguous Zammad POST is never retried when reconciliation finds no ticket", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = operationWorkspace();
  let posts = 0;
  let searches = 0;
  const connection = zammadTestConnection();
  const draft = zammadTestDraft();
  const operationId = zammadTicketOperationId(connection, draft);
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === "POST") {
      posts += 1;
      throw new TypeError("socket closed after request write");
    }
    assert.equal(init?.method, "GET");
    assert.equal(url.pathname, "/api/v1/tickets/search");
    assert.equal(url.searchParams.get("query"), operationId);
    searches += 1;
    return new Response("[]");
  };
  try {
    const operations = new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT);
    await assert.rejects(operations.create(connection, draft), /failed before an HTTP response/u);
    await assert.rejects(
      operations.create(connection, draft),
      (error) => {
        assert.equal(error instanceof Error, true);
        assert.equal((error as Error).message.includes(operationId), true);
        return true;
      },
    );
    assert.equal(posts, 1);
    assert.equal(searches, 1);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("an uncertain Zammad operation is completed from official search without another POST", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = operationWorkspace();
  let posts = 0;
  let searches = 0;
  const connection = zammadTestConnection();
  const draft = zammadTestDraft();
  const operationId = zammadTicketOperationId(connection, draft);
  let articleLookups = 0;
  globalThis.fetch = async (input, init) => {
    if (init?.method === "POST") {
      posts += 1;
      throw new TypeError("connection reset after request write");
    }
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/tickets/search") {
      searches += 1;
      return new Response(JSON.stringify([{ id: 81, number: "240081" }]));
    }
    assert.equal(url.pathname, "/api/v1/ticket_articles/by_ticket/81");
    articleLookups += 1;
    return new Response(JSON.stringify([{ internal: true, body: `Finding\n\n[relution-operation:${operationId}]` }]));
  };
  try {
    const firstRuntime = new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT);
    await assert.rejects(firstRuntime.create(connection, draft), /failed before an HTTP response/u);
    const recovered = await new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(connection, draft);
    globalThis.fetch = async () => { throw new Error("completed reconciliation must persist its result"); };
    const replay = await new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(connection, draft);
    assert.equal(posts, 1);
    assert.equal(searches, 1);
    assert.equal(articleLookups, 1);
    assert.equal(recovered.id, 81);
    assert.equal(replay.id, 81);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("completed Zammad operation record replays across a new runtime without a remote request", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = operationWorkspace();
  let posts = 0;
  globalThis.fetch = async (_input, init) => {
    posts += 1;
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({ id: 78, number: "240078" }), { status: 201 });
  };
  try {
    const connection = zammadTestConnection();
    const draft = zammadTestDraft();
    const first = await new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(connection, draft);
    globalThis.fetch = async () => { throw new Error("completed replay must not access Zammad"); };
    const replay = await new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(connection, draft);
    assert.equal(posts, 1);
    assert.equal(replay.id, first.id);
    assert.equal(replay.number, first.number);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

import "./zammad-api-operations.test-cases.js";
