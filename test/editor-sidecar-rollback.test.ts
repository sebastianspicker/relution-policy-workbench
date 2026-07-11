import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureSidecarState } from "../src/editor-sidecar-rollback.js";

test("captures missing, file, directory, and dangling symlink sidecar states", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-state-"));
  const sidecar = join(workspace, "editor-sidecar.json");

  assert.deepEqual(captureSidecarState(workspace), { kind: "missing" });

  writeFileSync(sidecar, "{\"version\":1}\n");
  assert.deepEqual(captureSidecarState(workspace), { kind: "file", contents: "{\"version\":1}\n" });

  rmSync(sidecar);
  mkdirSync(sidecar);
  assert.deepEqual(captureSidecarState(workspace), { kind: "directory" });

  rmSync(sidecar, { recursive: true });
  const danglingTarget = join(workspace, "does-not-exist.json");
  symlinkSync(danglingTarget, sidecar);
  assert.deepEqual(captureSidecarState(workspace), { kind: "symlink", target: danglingTarget });
});
