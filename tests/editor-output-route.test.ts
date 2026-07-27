/** Checks editor output endpoint authorization and constrained file delivery. */
import assert from "node:assert/strict";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleOutputApiRequest } from "../src/editor-output-route.js";

test("output route returns 404 only when the output file is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-output-route-"));
  const missingOutput = join(root, "missing.rexp");
  const response = createResponseRecorder();

  assert.equal(handleOutputApiRequest(new URL("http://localhost/api/output"), {} as never, response.stub, { options: { out: missingOutput } } as never), true);
  assert.equal(response.status, 404);
  assert.deepEqual(JSON.parse(response.body), { error: "No built .rexp output is available yet" });
});

test("output route propagates output safety failures to the central 500 handler", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-output-route-symlink-"));
  const output = join(root, "output.rexp");
  const linkedOutput = join(root, "linked-output.rexp");
  writeFileSync(output, "archive");
  symlinkSync(output, linkedOutput);
  const response = createResponseRecorder();

  assert.throws(
    () => handleOutputApiRequest(new URL("http://localhost/api/output"), {} as never, response.stub, { options: { out: linkedOutput } } as never),
    /symlink/u,
  );
  assert.equal(response.status, undefined);
});

function createResponseRecorder(): { stub: never; status?: number; body: string } {
  const recorder: { status?: number; body: string; stub?: never } = { body: "" };
  recorder.stub = {
    on: () => recorder.stub,
    writeHead: (status: number) => {
      recorder.status = status;
      return recorder.stub;
    },
    end: (body: string) => {
      recorder.body = body;
      return recorder.stub;
    },
  } as never;
  return recorder as { stub: never; status?: number; body: string };
}
