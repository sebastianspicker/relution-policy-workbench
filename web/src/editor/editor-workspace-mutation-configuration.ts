/** Adds configurations through the authoritative server mutation endpoint. */
import type { PolicyWorkspace } from "../../../src/workspace.js";
import { addConfigurationLabel, parseAddSelection } from "./editor-configuration-utils.js";
import { readJsonResponse } from "./editor-record-utils.js";
import { postAddConfiguration } from "./useEditorControllerActionRequests.js";
import { versionRecord } from "./editor-workspace-utils.js";
import { runExclusiveWorkspaceMutation, type WorkspaceMutationInput } from "./editor-workspace-mutation-context.js";
import { mergeWorkspaceServerUpdate, type WorkspaceServerUpdate } from "./editor-workspace-response.js";
import { clearWorkspaceHistory } from "./workspace-history.js";

export function createAddConfigurationAction(input: WorkspaceMutationInput): () => Promise<void> {
  return async (): Promise<void> => {
    const selection = input.selection;
    if (selection === undefined || input.selectedType.length === 0) return;
    await runExclusiveWorkspaceMutation(input, async (request) => {
      const workspace = await input.ensureSavedWorkspace(request);
      const policyPath = workspace?.policies[selection.policyIndex]?.path;
      if (policyPath === undefined) return;
      const addSelection = parseAddSelection(input.selectedType);
      const response = await postAddConfiguration(addSelection, policyPath, selection.versionIndex);
      const updated = await readJsonResponse<WorkspaceServerUpdate>(response);
      if (!response.ok) {
        if (input.requestGuard.isExclusiveCurrent(request)) input.setActionErrorStatus(`Configuration creation blocked: ${JSON.stringify(updated)}`);
        return;
      }
      if (!input.requestGuard.isExclusiveCurrent(request)) return;
      input.setState((current) => mergeWorkspaceServerUpdate(current, updated));
      input.setIsDirty(false);
      clearWorkspaceHistory(input.historyInput);
      input.setHasFreshBuild(false);
      const count = configurationCount(updated.workspace, selection.policyIndex, selection.versionIndex);
      input.setSelection({ policyIndex: selection.policyIndex, versionIndex: selection.versionIndex, configurationIndex: count - 1 });
      input.setSelectedType("");
      input.setActionSuccessStatus(`Added ${addConfigurationLabel(addSelection)}`);
    }, "Configuration creation failed");
  };
}

function configurationCount(workspace: PolicyWorkspace, policyIndex: number, versionIndex: number): number {
  const configurations = versionRecord(workspace, policyIndex, versionIndex)?.configurations;
  return Array.isArray(configurations) ? configurations.length : 1;
}
