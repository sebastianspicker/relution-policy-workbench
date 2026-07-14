import assert from "node:assert/strict";
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureSidecarState } from "../src/editor-sidecar-rollback.js";
import { saveEditorSidecar, type EditorSidecarState } from "../src/sidecar.js";

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

test("sidecar saves atomically replace private files", { skip: process.platform === "win32" }, () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-private-"));
  const sidecar: EditorSidecarState = {
    version: 1,
    mobileConfigRestore: [],
    ddmArtifacts: [],
    mdmCommandArtifacts: [],
    customManifests: [],
  };
  saveEditorSidecar(workspace, sidecar);
  saveEditorSidecar(workspace, { ...sidecar, appleSchemaRevision: "second-write" });

  assert.equal(lstatSync(join(workspace, "editor-sidecar.json")).mode & 0o777, 0o600);
  assert.deepEqual(readdirSync(workspace).filter((name) => name.includes(".tmp")), []);
  assert.deepEqual(captureSidecarState(workspace), {
    kind: "file",
    contents: `${JSON.stringify({ ...sidecar, appleSchemaRevision: "second-write" }, null, 2)}\n`,
  });
});
