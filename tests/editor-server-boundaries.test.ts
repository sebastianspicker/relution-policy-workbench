/** Exercises editor server request classification and terminal error safety. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { isEditorApiNamespace } from "../src/editor-api-namespaces.js";
import { HttpError } from "../src/editor-http-input.js";
import { runEditorApiHandlers } from "../src/editor-server-contract.js";
import { handleEditorServerError } from "../src/editor-server-errors.js";
import { parseEditorRequestUrl } from "../src/editor-server-request.js";
import { handleRelutionApiRequest } from "../src/relution-editor-routes.js";
import { handleZammadApiRequest } from "../src/zammad-editor-routes.js";
import { loadEditorSidecar, saveEditorSidecar } from "../src/sidecar.js";
import { SidecarInputError } from "../src/sidecar-types.js";
import { handleArchiveApiRequest } from "../src/editor-server-archive-compliance-routes.js";

test("editor service namespaces require a complete path segment", () => {
  assert.equal(isEditorApiNamespace("/api/relution", "relution"), true);
  assert.equal(isEditorApiNamespace("/api/relution/session", "relution"), true);
  assert.equal(isEditorApiNamespace("/api/relution-evil", "relution"), false);
  assert.equal(isEditorApiNamespace("/api/zammad-evil", "zammad"), false);
});

test("near-miss service paths fall through to the generic API 404 handler", async () => {
  const response = {} as never;
  assert.equal(await handleRelutionApiRequest(new URL("http://localhost/api/relution-evil"), {} as never, response, { lastDevices: [] }, "/tmp/workspace"), false);
  assert.equal(await handleZammadApiRequest(new URL("http://localhost/api/zammad-evil"), {} as never, response, {}), false);
});

test("invalid editor request targets become exposed 400 failures", () => {
  assert.throws(
    () => parseEditorRequestUrl("http://[invalid"),
    (error: unknown) => error instanceof HttpError && error.status === 400 && error.expose,
  );
});

test("editor handler chain stops at the first route that handles a request", async () => {
  const calls: string[] = [];
  const handled = await runEditorApiHandlers([
    () => { calls.push("first"); return false; },
    () => { calls.push("second"); return true; },
    () => { calls.push("third"); return true; },
  ], new URL("http://localhost/api/state"), {} as never, {} as never, {} as never);
  assert.equal(handled, true);
  assert.deepEqual(calls, ["first", "second"]);
});

test("editor error boundary destroys a partial response instead of writing twice", () => {
  let destroyCalls = 0;
  const originalError = console.error;
  console.error = () => undefined;
  const response = {
    destroyed: false,
    writableEnded: false,
    headersSent: true,
    destroy: () => { destroyCalls += 1; },
  };
  try {
    handleEditorServerError(response as never, new Error("storage failure"));
    assert.equal(destroyCalls, 1);
  } finally {
    console.error = originalError;
  }
});

test("editor error boundary exposes client input without logging it as a server failure", () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const response = responseStub();
    handleEditorServerError(response as never, new HttpError(400, "Invalid request"));
    assert.equal(errors.length, 0);
    assert.match(response.body, /Invalid request/u);
  } finally {
    console.error = originalError;
  }
});

test("persisted sidecar corruption and storage failures stay internal while client writes are input errors", () => {
  const root = mkdtempSync(join(tmpdir(), "rexp-editor-sidecar-error-"));
  try {
    writeFileSync(join(root, "editor-sidecar.json"), "{}\n");
    assert.throws(() => loadEditorSidecar(root), (error: unknown) => !(error instanceof SidecarInputError));
    rmSync(join(root, "editor-sidecar.json"));
    assert.throws(() => saveEditorSidecar(root, { version: 2 } as never), (error: unknown) => error instanceof SidecarInputError);
    mkdirSync(join(root, "editor-sidecar.json"));
    assert.throws(() => saveEditorSidecar(root, {
      version: 1, mobileConfigRestore: [], ddmArtifacts: [], mdmCommandArtifacts: [], customManifests: [],
    }), (error: unknown) => !(error instanceof SidecarInputError));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("editor build rejects weak new archive passphrases without affecting import compatibility", async () => {
  await assert.rejects(
    handleArchiveApiRequest(
      new URL("http://localhost/api/build"),
      { method: "POST" } as never,
      {} as never,
      { options: { workspace: "/tmp/workspace", out: "/tmp/output.rexp" }, runtimeState: { key: "key123" } } as never,
    ),
    (error: unknown) => error instanceof HttpError
      && error.status === 400
      && error.message === "New archive passphrase must be at least 16 characters and must not be an obvious default.",
  );
});

function responseStub(): { body: string; on: () => void; writeHead: () => void; end: (body: string) => void } {
  let body = "";
  return {
    get body() { return body; },
    on: () => undefined,
    writeHead: () => undefined,
    end: (value: string) => { body = value; },
  };
}
