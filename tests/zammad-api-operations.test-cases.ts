/** Covers Zammad persisted operation records and route responses. */
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { handleZammadApiRequest } from "../src/zammad-editor-routes.js";
import { ZammadTicketOperations, zammadTicketOperationId } from "../src/zammad-ticket-operations.js";
import { TEST_HTTP_SERVICE_TRANSPORT } from "./http-service-test-adapter.js";
import { operationWorkspace, zammadTestConnection, zammadTestDraft } from "./zammad-api.test.js";

test("invalid Zammad operation records fail closed before any remote request", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = operationWorkspace();
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("{}");
  };
  try {
    const connection = zammadTestConnection();
    const draft = zammadTestDraft();
    const operationId = zammadTicketOperationId(connection, draft);
    const operationDirectory = join(workspace, ".rexp-studio-private", "zammad-ticket-operations");
    mkdirSync(operationDirectory, { recursive: true, mode: 0o700 });
    writeFileSync(
      join(operationDirectory, `${operationId}.json`),
      `${JSON.stringify({ version: 1, id: operationId, state: "completed", updatedAt: "2026-01-01T00:00:00.000Z", result: { id: 1, evil: "link-injection" } })}\n`,
      { mode: 0o600 },
    );
    await assert.rejects(
      new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT).create(connection, draft),
      /record is invalid; refusing ticket creation/u,
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("Zammad ticket route returns its operation ID and uses the workspace operation store", async () => {
  const originalFetch = globalThis.fetch;
  const workspace = operationWorkspace();
  let responseStatus: number | undefined;
  let responseBody = "";
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify({ id: 79, number: "240079" }), { status: 201 });
  };
  try {
    const draft = zammadTestDraft();
    const request = {
      method: "POST",
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(JSON.stringify({ draft }));
      },
    };
    const response = {
      on: () => response,
      writeHead: (status: number) => { responseStatus = status; },
      end: (body: string) => { responseBody = body; },
    };
    await handleZammadApiRequest(
      new URL("http://localhost/api/zammad/tickets"),
      request as never,
      response as never,
      {
        connection: zammadTestConnection(),
        ticketOperations: new ZammadTicketOperations(workspace, TEST_HTTP_SERVICE_TRANSPORT),
      },
      false,
      workspace,
    );
    const payload = JSON.parse(responseBody) as { operationId: string; ticket: { id: number } };
    assert.equal(responseStatus, 200);
    assert.equal(payload.ticket.id, 79);
    assert.equal(payload.operationId, zammadTicketOperationId(zammadTestConnection(), draft));
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(workspace, { recursive: true, force: true });
  }
});
