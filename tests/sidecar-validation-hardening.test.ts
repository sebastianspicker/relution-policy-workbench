/** Verifies complete persisted artifact validation and UUID collision handling. */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addDdmArtifact,
  loadEditorSidecar,
  SidecarInputError,
  type EditorSidecarState,
} from "../src/sidecar.js";

test("persisted DDM and MDM records require their complete contract", () => {
  for (const [name, sidecar] of invalidArtifactScenarios()) {
    const workspace = mkdtempSync(join(tmpdir(), `relution-sidecar-invalid-${name}-`));
    writeFileSync(join(workspace, "editor-sidecar.json"), `${JSON.stringify(sidecar)}\n`);
    let error: unknown;
    try {
      loadEditorSidecar(workspace);
    } catch (caught) {
      error = caught;
    }
    assert.equal(error instanceof SidecarInputError, false, name);
    assert.match(String(error), /Malformed editor-sidecar\.json: invalid/u, name);
  }
});

test("persisted duplicate artifact UUIDs fail closed and client additions reject collisions", () => {
  const workspace = mkdtempSync(join(tmpdir(), "relution-sidecar-duplicate-"));
  const artifact = ddmArtifact("DUPLICATE-UUID");
  writeFileSync(join(workspace, "editor-sidecar.json"), `${JSON.stringify(withArtifacts([artifact, structuredClone(artifact)], []))}\n`);
  assert.throws(() => loadEditorSidecar(workspace), /duplicate ddmArtifacts UUID/u);

  const freshWorkspace = mkdtempSync(join(tmpdir(), "relution-sidecar-add-duplicate-"));
  addDdmArtifact(freshWorkspace, artifact);
  assert.throws(
    () => addDdmArtifact(freshWorkspace, artifact),
    (error: unknown) => error instanceof SidecarInputError && /Duplicate DDM artifact UUID/u.test(error.message),
  );
});

function invalidArtifactScenarios(): Array<[string, EditorSidecarState]> {
  const validDdm = ddmArtifact("DDM-1");
  const validMdm = mdmArtifact("MDM-1");
  return [
    ["ddm-missing-kind", withArtifacts([{ ...validDdm, kind: undefined } as never], [])],
    ["ddm-status-kind", withArtifacts([{ ...validDdm, kind: "ddm-status" }], [])],
    ["ddm-empty-identifier", withArtifacts([{ ...validDdm, identifier: "" }], [])],
    ["ddm-non-record-values", withArtifacts([{ ...validDdm, values: [] } as never], [])],
    ["mdm-missing-request-type", withArtifacts([], [{ ...validMdm, requestType: undefined } as never])],
    ["mdm-mismatched-payload", withArtifacts([], [{ ...validMdm, payload: { RequestType: "Other" } }])],
  ];
}

function withArtifacts(ddmArtifacts: EditorSidecarState["ddmArtifacts"], mdmCommandArtifacts: EditorSidecarState["mdmCommandArtifacts"]): EditorSidecarState {
  return { version: 1, mobileConfigRestore: [], ddmArtifacts, mdmCommandArtifacts, customManifests: [] };
}

function ddmArtifact(uuid: string): EditorSidecarState["ddmArtifacts"][number] {
  return {
    uuid,
    schemaId: "ddm-configuration:Example",
    kind: "ddm-configuration",
    identifier: "com.example.ddm",
    title: "Example DDM",
    values: {},
    payload: {},
  };
}

function mdmArtifact(uuid: string): EditorSidecarState["mdmCommandArtifacts"][number] {
  return {
    uuid,
    schemaId: "mdm-command:Example",
    requestType: "Example",
    title: "Example MDM",
    values: {},
    payload: { RequestType: "Example" },
  };
}
