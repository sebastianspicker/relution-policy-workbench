/** Exposes typed DDM and MDM artifact mutations backed by sidecar persistence. */
import type { AppleSchemaCatalog, AppleSchemaValues, DdmArtifact, MdmCommandArtifact } from "./apple-schema.js";
import { addManagedArtifact, removeManagedArtifact, updateManagedArtifact } from "./sidecar-artifacts.js";
import { DDM_ARTIFACT_OPERATIONS, MDM_COMMAND_ARTIFACT_OPERATIONS, type ManagedArtifact, type ManagedArtifactOperations } from "./sidecar-artifact-contracts.js";
import { asSidecarInputError, loadEditorSidecar, saveEditorSidecar } from "./sidecar-persistence.js";
import type { EditorSidecarState } from "./sidecar-types.js";

export function addDdmArtifact(workspaceDir: string, artifact: DdmArtifact, appleSchemaRevision?: string): EditorSidecarState {
  return updateArtifact(workspaceDir, appleSchemaRevision, (sidecar) => addManagedArtifact(sidecar, artifact, DDM_ARTIFACT_OPERATIONS));
}

export function addMdmCommandArtifact(workspaceDir: string, artifact: MdmCommandArtifact, appleSchemaRevision?: string): EditorSidecarState {
  return updateArtifact(workspaceDir, appleSchemaRevision, (sidecar) => addManagedArtifact(sidecar, artifact, MDM_COMMAND_ARTIFACT_OPERATIONS));
}

export function updateDdmArtifact(workspaceDir: string, catalog: AppleSchemaCatalog, uuid: string, values: AppleSchemaValues, appleSchemaRevision?: string): EditorSidecarState {
  return updateSchemaArtifact(workspaceDir, catalog, uuid, values, appleSchemaRevision, DDM_ARTIFACT_OPERATIONS);
}

export function updateMdmCommandArtifact(workspaceDir: string, catalog: AppleSchemaCatalog, uuid: string, values: AppleSchemaValues, appleSchemaRevision?: string): EditorSidecarState {
  return updateSchemaArtifact(workspaceDir, catalog, uuid, values, appleSchemaRevision, MDM_COMMAND_ARTIFACT_OPERATIONS);
}

function updateSchemaArtifact<T extends ManagedArtifact>(
  workspaceDir: string,
  catalog: AppleSchemaCatalog,
  uuid: string,
  values: AppleSchemaValues,
  appleSchemaRevision: string | undefined,
  operations: ManagedArtifactOperations<T>,
): EditorSidecarState {
  return updateArtifact(workspaceDir, appleSchemaRevision, (sidecar) => updateManagedArtifact(sidecar, catalog, uuid, values, operations));
}

export function removeDdmArtifact(workspaceDir: string, uuid: string, appleSchemaRevision?: string): EditorSidecarState {
  return updateArtifact(workspaceDir, appleSchemaRevision, (sidecar) => removeManagedArtifact(sidecar, uuid, DDM_ARTIFACT_OPERATIONS));
}

export function removeMdmCommandArtifact(workspaceDir: string, uuid: string, appleSchemaRevision?: string): EditorSidecarState {
  return updateArtifact(workspaceDir, appleSchemaRevision, (sidecar) => removeManagedArtifact(sidecar, uuid, MDM_COMMAND_ARTIFACT_OPERATIONS));
}

function updateArtifact(workspaceDir: string, revision: string | undefined, update: (sidecar: EditorSidecarState) => EditorSidecarState): EditorSidecarState {
  const sidecar = loadEditorSidecar(workspaceDir);
  let revised: EditorSidecarState;
  try {
    const next = update(sidecar);
    revised = revision === undefined ? next : { ...next, appleSchemaRevision: revision };
  } catch (error) {
    throw asSidecarInputError(error);
  }
  saveEditorSidecar(workspaceDir, revised);
  return revised;
}
