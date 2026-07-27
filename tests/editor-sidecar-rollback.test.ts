/** Validates rollback of sidecar changes after failed editor operations. */
import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureSidecarState, restoreSidecarState, rollbackPersistedEditorState } from "../src/editor-sidecar-rollback.js";
import { MAX_EDITOR_SIDECAR_JSON_BYTES, resetEditorSidecar, saveEditorSidecar, type EditorSidecarState } from "../src/sidecar.js";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace, loadWorkspace } from "../src/workspace.js";

test("captures missing and arbitrary-byte regular sidecar states", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-state-"));
  const sidecar = join(workspace, "editor-sidecar.json");

  assert.deepEqual(captureSidecarState(workspace), { kind: "missing" });

  const bytes = Buffer.from([0xff, 0xfe, 0xfd]);
  writeFileSync(sidecar, bytes);
  assert.deepEqual(captureSidecarState(workspace), { kind: "file", contents: bytes });
});

test("capture rejects non-file sidecar paths without deleting their evidence", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-invalid-state-"));
  const sidecar = join(workspace, "editor-sidecar.json");
  const sentinel = join(sidecar, "sentinel.bin");
  mkdirSync(sidecar);
  writeFileSync(sentinel, "evidence");
  assert.throws(() => captureSidecarState(workspace), /missing or a regular file/u);
  assert.equal(readFileSync(sentinel, "utf8"), "evidence");

  rmSync(sidecar, { recursive: true });
  const danglingTarget = join(workspace, "does-not-exist.json");
  symlinkSync(danglingTarget, sidecar);
  assert.throws(() => captureSidecarState(workspace), /must not use symlinks/u);
  assert.equal(lstatSync(sidecar).isSymbolicLink(), true);
});

test("rollback restores arbitrary sidecar bytes exactly", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-byte-rollback-"));
  const bundle = loadTemplateBundle();
  createNewWorkspace({ workspace, platform: "IOS", name: "Byte rollback", serverVersion: bundle.serverVersion });
  const sidecar = join(workspace, "editor-sidecar.json");
  const original = Buffer.from([0xff, 0xfe, 0xfd, 0x00]);
  writeFileSync(sidecar, original);
  const snapshot = captureSidecarState(workspace);
  const previousWorkspace = loadWorkspace(workspace);
  writeFileSync(sidecar, "replacement");

  rollbackPersistedEditorState(workspace, previousWorkspace, snapshot, new Error("transaction failed"));

  assert.deepEqual(readFileSync(sidecar), original);
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
    contents: Buffer.from(`${JSON.stringify({ ...sidecar, appleSchemaRevision: "second-write" }, null, 2)}\n`),
  });
});

test("reset only unlinks a regular sidecar and treats a missing sidecar as a no-op", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-reset-"));
  const sidecar = join(workspace, "editor-sidecar.json");
  resetEditorSidecar(workspace);
  writeFileSync(sidecar, "stale");
  resetEditorSidecar(workspace);
  assert.equal(existsSync(sidecar), false);

  mkdirSync(sidecar);
  const sentinel = join(sidecar, "sentinel");
  writeFileSync(sentinel, "must survive");
  assert.throws(() => resetEditorSidecar(workspace), /missing or a regular file/u);
  assert.equal(readFileSync(sentinel, "utf8"), "must survive");
});

test("rollback deletion uses the same regular-file guard", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-rollback-delete-"));
  const sidecar = join(workspace, "editor-sidecar.json");
  writeFileSync(sidecar, "stale");
  restoreSidecarState(workspace, { kind: "missing" });
  assert.equal(existsSync(sidecar), false);

  mkdirSync(sidecar);
  const sentinel = join(sidecar, "sentinel");
  writeFileSync(sentinel, "must survive");
  assert.throws(() => restoreSidecarState(workspace, { kind: "missing" }), /missing or a regular file/u);
  assert.equal(readFileSync(sentinel, "utf8"), "must survive");
});

test("capture and restore reject oversize state before allocating or mutating", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-bounded-"));
  const sidecar = join(workspace, "editor-sidecar.json");
  writeFileSync(sidecar, "preserve");
  const before = readFileSync(sidecar);
  assert.throws(
    () => restoreSidecarState(workspace, { kind: "file", contents: Buffer.alloc(MAX_EDITOR_SIDECAR_JSON_BYTES + 1) }),
    /snapshot exceeds the 16777216 byte limit/u,
  );
  assert.deepEqual(readFileSync(sidecar), before);
  truncateSync(sidecar, MAX_EDITOR_SIDECAR_JSON_BYTES + 1);
  assert.throws(() => captureSidecarState(workspace), /Editor sidecar JSON file exceeds the .* byte limit/u);
});
