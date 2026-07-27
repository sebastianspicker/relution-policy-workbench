/** Restores bounded sidecar snapshots through the fixed safe-sidecar path. */
import { saveWorkspace, type PolicyWorkspace } from "./workspace.js";
import { deleteEditorSidecarFile, readEditorSidecarBytes, writeEditorSidecarBytes } from "./sidecar-path.js";
import { MAX_EDITOR_SIDECAR_JSON_BYTES } from "./sidecar-types.js";

export type SidecarPathState =
  | { kind: "missing" }
  | { kind: "file"; contents: Buffer };

export function captureSidecarState(workspaceDir: string): SidecarPathState {
  const contents = readEditorSidecarBytes(workspaceDir);
  return contents === undefined ? { kind: "missing" } : { kind: "file", contents };
}

export function restoreSidecarState(workspaceDir: string, snapshot: SidecarPathState): void {
  if (snapshot.kind === "missing") {
    deleteEditorSidecarFile(workspaceDir);
    return;
  }
  if (snapshot.contents.length > MAX_EDITOR_SIDECAR_JSON_BYTES) {
    throw new Error(`Editor sidecar snapshot exceeds the ${String(MAX_EDITOR_SIDECAR_JSON_BYTES)} byte limit`);
  }
  writeEditorSidecarBytes(workspaceDir, snapshot.contents);
}

export function rollbackPersistedEditorState(
  workspaceDir: string,
  previousWorkspace: PolicyWorkspace,
  previousSidecar: SidecarPathState,
  originalError: unknown,
): void {
  const rollbackErrors: string[] = [];

  try {
    saveWorkspace(workspaceDir, previousWorkspace);
  } catch (error) {
    rollbackErrors.push(`workspace rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    restoreSidecarState(workspaceDir, previousSidecar);
  } catch (error) {
    rollbackErrors.push(`sidecar rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (rollbackErrors.length > 0) {
    const originalMessage = originalError instanceof Error ? originalError.message : String(originalError);
    throw new Error(`${originalMessage}; ${rollbackErrors.join("; ")}`);
  }
}
