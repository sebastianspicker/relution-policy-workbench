/** Persists the complete sidecar record without changing its public API. */
import { collectMobileConfigRestoreEntries } from "./sidecar-mobileconfig-restore.js";
import { deleteEditorSidecarFile, readEditorSidecarBytes, writeEditorSidecarBytes } from "./sidecar-path.js";
import { emptyEditorSidecar, SidecarInputError, type EditorSidecarState } from "./sidecar-types.js";
import { parseEditorSidecar, validateSidecarInput } from "./sidecar-validation.js";
import type { PolicyWorkspace } from "./workspace.js";

export function loadEditorSidecar(workspaceDir: string): EditorSidecarState {
  const bytes = readEditorSidecarBytes(workspaceDir);
  if (bytes === undefined) return emptyEditorSidecar();
  // Persisted corruption is a storage/runtime failure, not malformed client
  // input. Keep it outside the 4xx SidecarInputError boundary.
  return parseEditorSidecar(bytes.toString("utf8"));
}

export function saveEditorSidecar(workspaceDir: string, sidecar: EditorSidecarState): void {
  try {
    validateSidecarInput(sidecar);
  } catch (error) {
    throw asSidecarInputError(error);
  }
  writeEditorSidecarBytes(workspaceDir, Buffer.from(`${JSON.stringify(sidecar, null, 2)}\n`, "utf8"));
}

export function resetEditorSidecar(workspaceDir: string): void {
  deleteEditorSidecarFile(workspaceDir);
}

export function recordMobileConfigRestoreEntries(
  workspaceDir: string,
  workspace: PolicyWorkspace,
  appleSchemaRevision?: string,
): EditorSidecarState {
  return updateSidecar(workspaceDir, appleSchemaRevision, (sidecar) => ({ ...sidecar, mobileConfigRestore: collectMobileConfigRestoreEntries(workspace) }));
}

export function replaceEditorSidecarFromWorkspace(
  workspaceDir: string,
  workspace: PolicyWorkspace,
  appleSchemaRevision?: string,
): EditorSidecarState {
  const next = { ...emptyEditorSidecar(), ...(appleSchemaRevision === undefined ? {} : { appleSchemaRevision }), mobileConfigRestore: collectMobileConfigRestoreEntries(workspace) };
  saveEditorSidecar(workspaceDir, next);
  return next;
}

function updateSidecar(
  workspaceDir: string,
  appleSchemaRevision: string | undefined,
  update: (sidecar: EditorSidecarState) => EditorSidecarState,
): EditorSidecarState {
  const next = update(loadEditorSidecar(workspaceDir));
  const revised = appleSchemaRevision === undefined ? next : { ...next, appleSchemaRevision };
  saveEditorSidecar(workspaceDir, revised);
  return revised;
}

export function asSidecarInputError(error: unknown): SidecarInputError {
  if (error instanceof SidecarInputError) return error;
  return new SidecarInputError(error instanceof Error ? error.message : String(error));
}
