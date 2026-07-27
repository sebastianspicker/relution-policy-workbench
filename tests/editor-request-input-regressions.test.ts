/** Verifies editor request guards reject malformed authority and optional fields. */
import assert from "node:assert/strict";
import { type IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import test from "node:test";
import { optionalRecord, optionalString } from "../src/editor-api-request-input.js";
import { assertAuthorizedEditorApiRequest, assertSafeMutatingApiRequest } from "../src/editor-api-request-guards.js";
import { HttpError } from "../src/editor-http-input.js";
import { handleArchiveApiRequest } from "../src/editor-server-archive-compliance-routes.js";
import { handleAppleArtifactApiRequest } from "../src/editor-server-apple-routes.js";
import { handleRelutionApiRequest } from "../src/relution-editor-routes.js";
import { handleZammadApiRequest } from "../src/zammad-editor-routes.js";

const OPTIONS = { workspace: "/tmp/workspace", key: "", out: "/tmp/output.rexp" };

test("editor authority guard rejects malformed Host syntax before loopback normalization", () => {
  for (const host of ["user@127.0.0.1", "127.0.0.1/path", "127.0.0.1?query", "127.0.0.1#fragment"]) {
    assert.throws(
      () => assertAuthorizedEditorApiRequest(request({ host, "x-rexp-studio-token": "token" }), OPTIONS, "token"),
      isHttpError(400, /Invalid Host header/u),
      host,
    );
  }
});

test("editor mutation guard rejects Origin credentials, paths, queries, and fragments", () => {
  for (const origin of ["http://user@127.0.0.1", "http://127.0.0.1/path", "http://127.0.0.1?query", "http://127.0.0.1#fragment"]) {
    const guarded = request({ host: "127.0.0.1", origin, "content-type": "application/json" });
    assert.throws(
      () => assertSafeMutatingApiRequest(guarded, OPTIONS),
      isHttpError(403, /same-origin/u),
      origin,
    );
  }
});

test("strict optional readers distinguish absent fields from wrong types", () => {
  assert.equal(optionalString({}, "key"), undefined);
  assert.equal(optionalRecord({}, "values"), undefined);
  assert.throws(() => optionalString({ key: 42 }, "key"), isHttpError(400, /Expected string body field: key/u));
  assert.throws(() => optionalRecord({ values: [] }, "values"), isHttpError(400, /Expected object body field: values/u));
});

test("import route rejects a wrongly typed optional key instead of falling back", async () => {
  await assert.rejects(
    handleArchiveApiRequest(new URL("http://localhost/api/import"), jsonRequest({ key: 42 }), responseStub(), archiveContext()),
    isHttpError(400, /Expected string body field: key/u),
  );
});

test("Relution and Zammad session routes reject wrongly typed optional connection fields", async () => {
  await assert.rejects(
    handleRelutionApiRequest(new URL("http://localhost/api/relution/session"), jsonRequest({ host: "relution.example.test", apiToken: "token", basePath: 42 }), responseStub(), { lastDevices: [] }, "/tmp/workspace"),
    isHttpError(400, /Expected string body field: basePath/u),
  );
  await assert.rejects(
    handleZammadApiRequest(new URL("http://localhost/api/zammad/session"), jsonRequest({ host: "zammad.example.test", apiToken: "token", group: "IT", customer: "user@example.test", protocol: false }), responseStub(), {}),
    isHttpError(400, /Expected string body field: protocol/u),
  );
});

test("Apple custom-settings route rejects a wrongly typed optional settings record", async () => {
  await assert.rejects(
    handleAppleArtifactApiRequest(new URL("http://localhost/api/custom-settings/add"), jsonRequest({ policyPath: "policies/example.json", versionIndex: 0, settings: "invalid" }), responseStub(), appleContext()),
    isHttpError(400, /Expected object body field: settings/u),
  );
});

function request(headers: Record<string, string>): IncomingMessage {
  return { headers } as IncomingMessage;
}

function jsonRequest(value: unknown): IncomingMessage {
  const requestStream = Readable.from([Buffer.from(JSON.stringify(value))]);
  Object.assign(requestStream, { method: "POST" });
  return requestStream as IncomingMessage;
}

function responseStub(): never {
  return { writeHead: () => undefined, end: () => undefined } as never;
}

function archiveContext(): never {
  return { runtimeState: { key: "fallback-key" } } as never;
}

function appleContext(): never {
  return { options: { workspace: "/tmp/workspace" } } as never;
}

function isHttpError(status: number, message: RegExp): (error: unknown) => boolean {
  return (error) => error instanceof HttpError && error.status === status && message.test(error.message);
}
