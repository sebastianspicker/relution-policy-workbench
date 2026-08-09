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
import { OperationQueueAbortedError } from "../src/utils/bounded-operation-queue.js";
import { WorkspaceInputError } from "../src/workspace.js";
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
  const originalError = console.error;
  console.error = () => undefined;
  const response = responseStub({ headersSent: true });
  try {
    handleEditorServerError(response as never, new Error("storage failure"));
    assert.equal(response.destroyCalls, 1);
    assert.deepEqual(response.writeHeadCalls, []);
    assert.deepEqual(response.endCalls, []);
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
    assertEditorJson(response, 400, { error: "Invalid request" });
  } finally {
    console.error = originalError;
  }
});

test("editor error boundary ignores mutation cancellations without response or logging work", () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const response = responseStub();
    handleEditorServerError(response as never, new OperationQueueAbortedError());
    assert.equal(errors.length, 0);
    assert.equal(response.destroyCalls, 0);
    assert.deepEqual(response.writeHeadCalls, []);
    assert.deepEqual(response.endCalls, []);
  } finally {
    console.error = originalError;
  }
});

test("editor error boundary logs server failures before terminal-response checks", () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    for (const response of [responseStub({ destroyed: true }), responseStub({ writableEnded: true })]) {
      handleEditorServerError(response as never, new Error("storage failure"));
      assert.equal(response.destroyCalls, 0);
      assert.deepEqual(response.writeHeadCalls, []);
      assert.deepEqual(response.endCalls, []);
    }
    assert.equal(errors.length, 2);
  } finally {
    console.error = originalError;
  }
});

test("editor error boundary classifies workspace and sidecar input failures as client errors", () => {
  for (const error of [new WorkspaceInputError("Invalid workspace"), new SidecarInputError("Invalid sidecar")]) {
    const response = responseStub();
    handleEditorServerError(response as never, error);
    assertEditorJson(response, 400, { error: error.message });
  }
});

test("editor error boundary sanitizes and logs unexposed server failures", () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  const error = new HttpError(503, "Sensitive storage failure", false);
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const response = responseStub();
    handleEditorServerError(response as never, error);
    assertEditorJson(response, 503, { error: "Internal editor error" });
    assert.deepEqual(errors, [[error]]);
  } finally {
    console.error = originalError;
  }
});

test("editor error boundary preserves exposed server messages while logging them", () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  const error = new HttpError(503, "Retry after maintenance", true);
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const response = responseStub();
    handleEditorServerError(response as never, error);
    assertEditorJson(response, 503, { error: "Retry after maintenance" });
    assert.deepEqual(errors, [[error]]);
  } finally {
    console.error = originalError;
  }
});

test("editor error boundary preserves unexposed client messages and sanitizes ordinary values", () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const clientResponse = responseStub();
    handleEditorServerError(clientResponse as never, new HttpError(429, "Retry later", false));
    assertEditorJson(clientResponse, 429, { error: "Retry later" });

    const errorResponse = responseStub();
    const error = new Error("Sensitive ordinary failure");
    handleEditorServerError(errorResponse as never, error);
    assertEditorJson(errorResponse, 500, { error: "Internal editor error" });

    const valueResponse = responseStub();
    handleEditorServerError(valueResponse as never, "Sensitive non-error failure");
    assertEditorJson(valueResponse, 500, { error: "Internal editor error" });
    assert.deepEqual(errors, [[error], ["Sensitive non-error failure"]]);
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

interface ResponseStub {
  readonly body: string;
  readonly writeHeadCalls: Array<{ readonly status: number; readonly headers: Record<string, string> }>;
  readonly endCalls: string[];
  destroyed: boolean;
  writableEnded: boolean;
  headersSent: boolean;
  destroyCalls: number;
  on: () => void;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body: string) => void;
  destroy: () => void;
}

function responseStub(options: Partial<Pick<ResponseStub, "destroyed" | "writableEnded" | "headersSent">> = {}): ResponseStub {
  let body = "";
  const writeHeadCalls: Array<{ readonly status: number; readonly headers: Record<string, string> }> = [];
  const endCalls: string[] = [];
  return {
    get body() { return body; },
    writeHeadCalls,
    endCalls,
    destroyed: options.destroyed ?? false,
    writableEnded: options.writableEnded ?? false,
    headersSent: options.headersSent ?? false,
    destroyCalls: 0,
    on: () => undefined,
    writeHead: (status, headers) => { writeHeadCalls.push({ status, headers }); },
    end: (value: string) => { body = value; endCalls.push(value); },
    destroy() { this.destroyCalls += 1; },
  };
}

function assertEditorJson(response: ResponseStub, status: number, value: { readonly error: string }): void {
  const body = JSON.stringify(value);
  assert.deepEqual(response.writeHeadCalls, [{
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
  }]);
  assert.deepEqual(response.endCalls, [body]);
  assert.equal(response.body, body);
}
