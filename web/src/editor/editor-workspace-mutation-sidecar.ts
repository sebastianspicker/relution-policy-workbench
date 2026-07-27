/** Reconciles sidecar snapshots through the authoritative server response. */
import type { PolicyWorkspace, WorkspaceValidationResult } from "../../../src/workspace.js";
import { postJson } from "./editor-api-client.js";
import { isEditorSidecarState, readJsonResponse } from "./editor-record-utils.js";
import { runExclusiveWorkspaceMutation, type WorkspaceMutationInput } from "./editor-workspace-mutation-context.js";
import type { AppState, JsonRecord } from "./types.js";
import { clearWorkspaceHistory } from "./workspace-history.js";

export function createReconcileSidecarAction(input: WorkspaceMutationInput): () => Promise<void> {
  return async (): Promise<void> => {
    await runExclusiveWorkspaceMutation(input, async (request) => {
      if (await input.ensureSavedWorkspace(request) === undefined) return;
      const response = await postJson("/api/roundtrip/reconcile", {});
      const result = await readJsonResponse<{ workspace?: PolicyWorkspace; validation?: WorkspaceValidationResult; sidecar?: AppState["sidecar"] } & JsonRecord>(response);
      if (!response.ok || result.workspace === undefined || result.validation === undefined || !isEditorSidecarState(result.sidecar)) {
        input.setActionErrorStatus(`Sidecar reconcile blocked: ${JSON.stringify(result)}`);
        return;
      }
      if (!input.requestGuard.isExclusiveCurrent(request)) return;
      const { workspace, validation, sidecar } = result;
      input.setState((current) => current === undefined ? current : { ...current, workspace, validation, sidecar });
      input.setIsDirty(false);
      clearWorkspaceHistory(input.historyInput);
      input.setHasFreshBuild(false);
      input.setActionSuccessStatus("Reconciled sidecar restore snapshots");
    }, "Sidecar reconcile failed");
  };
}
