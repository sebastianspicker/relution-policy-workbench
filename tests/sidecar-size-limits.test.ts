/** Enforces byte limits for sidecar data stored beside encrypted archives. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadEditorSidecar,
  MAX_EDITOR_SIDECAR_JSON_BYTES,
  saveEditorSidecar,
  type EditorSidecarState,
} from "../src/sidecar.js";

test("sidecar writer accepts its exact read boundary", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-exact-"));
  try {
    const sidecar = paddedSidecar(MAX_EDITOR_SIDECAR_JSON_BYTES);
    saveEditorSidecar(workspace, sidecar);
    assert.equal(readFileSync(join(workspace, "editor-sidecar.json")).length, MAX_EDITOR_SIDECAR_JSON_BYTES);
    assert.equal(loadEditorSidecar(workspace).customManifests[0]?.uuid, "MANIFEST-1");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("oversized sidecar writes reject before replacing the prior file", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-oversized-write-"));
  try {
    const original = paddedSidecar(1024);
    saveEditorSidecar(workspace, original);
    const path = join(workspace, "editor-sidecar.json");
    const previous = readFileSync(path);
    assert.throws(
      () => saveEditorSidecar(workspace, paddedSidecar(MAX_EDITOR_SIDECAR_JSON_BYTES + 1)),
      /Editor sidecar JSON file exceeds the 16777216 byte limit/u,
    );
    assert.deepEqual(readFileSync(path), previous);
    assert.equal(loadEditorSidecar(workspace).customManifests[0]?.uuid, "MANIFEST-1");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function paddedSidecar(targetBytes: number): EditorSidecarState {
  const sidecar: EditorSidecarState = {
    version: 1,
    mobileConfigRestore: [],
    ddmArtifacts: [],
    mdmCommandArtifacts: [],
    customManifests: [{ uuid: "MANIFEST-1", name: "Padded", schema: { padding: "" } }],
  };
  const emptyLength = Buffer.byteLength(`${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
  if (targetBytes < emptyLength) throw new Error(`Target ${String(targetBytes)} is smaller than sidecar framing ${String(emptyLength)}`);
  sidecar.customManifests[0]!.schema.padding = "x".repeat(targetBytes - emptyLength);
  assert.equal(Buffer.byteLength(`${JSON.stringify(sidecar, null, 2)}\n`, "utf8"), targetBytes);
  return sidecar;
}
