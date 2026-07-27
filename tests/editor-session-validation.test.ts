/** Protects editor session validation against unsafe or stale session input. */
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { HttpError } from "../src/editor-http-input.js";
import { normalizeRelutionConnection } from "../src/relution-api.js";
import { handleRelutionApiRequest } from "../src/relution-editor-routes.js";
import { normalizeZammadConnection } from "../src/zammad-api.js";
import { handleZammadApiRequest } from "../src/zammad-editor-routes.js";

test("invalid Relution session input is a 400 and preserves the previous session", async () => {
  const existing = normalizeRelutionConnection({ host: "relution.example.test", apiToken: "existing-token" });
  const runtime = { connection: existing, lastDevices: [] };
  await assert.rejects(
    handleRelutionApiRequest(
      new URL("http://localhost/api/relution/session"),
      jsonRequest({ host: "relution.example.test", apiToken: "replacement-token", port: 70_000 }),
      responseStub(),
      runtime,
      "/tmp/workspace",
    ),
    isBadRequest(/Invalid Relution port: 70000/u),
  );
  assert.equal(runtime.connection, existing);
});

test("invalid Zammad session input is a 400 and preserves the previous session", async () => {
  const existing = normalizeZammadConnection({
    host: "zammad.example.test",
    apiToken: "existing-token",
    group: "IT",
    customer: "it@example.test",
  });
  const runtime = { connection: existing };
  await assert.rejects(
    handleZammadApiRequest(
      new URL("http://localhost/api/zammad/session"),
      jsonRequest({
        host: "zammad.example.test",
        apiToken: "replacement-token",
        group: "IT",
        customer: "it@example.test",
        port: 70_000,
      }),
      responseStub(),
      runtime,
    ),
    isBadRequest(/Invalid Zammad port: 70000/u),
  );
  assert.equal(runtime.connection, existing);
});

function jsonRequest(value: unknown): never {
  const request = Readable.from([Buffer.from(JSON.stringify(value))]);
  Object.assign(request, { method: "POST" });
  return request as never;
}

function responseStub(): never {
  return {
    writeHead: () => undefined,
    end: () => undefined,
  } as never;
}

function isBadRequest(message: RegExp): (error: unknown) => boolean {
  return (error) => {
    assert.equal(error instanceof HttpError, true);
    assert.equal((error as HttpError).status, 400);
    assert.match((error as Error).message, message);
    return true;
  };
}
