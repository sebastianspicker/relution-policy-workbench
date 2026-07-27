/** Canonical merge for authoritative workspace responses. */
import type { PolicyWorkspace, WorkspaceValidationResult } from "../../../src/workspace.js";
import type { AppState } from "./types.js";

export interface WorkspaceServerUpdate {
  readonly workspace: PolicyWorkspace;
  readonly validation: WorkspaceValidationResult;
  readonly sidecar?: AppState["sidecar"];
}

export function mergeWorkspaceServerUpdate(current: AppState | undefined, updated: WorkspaceServerUpdate): AppState | undefined {
  if (current === undefined) return undefined;
  return {
    ...current,
    workspace: updated.workspace,
    validation: updated.validation,
    sidecar: updated.sidecar ?? current.sidecar,
  };
}
