/** Creates policies through the server and accepts only its current response. */
import { postJson } from "./editor-api-client.js";
import { readJsonResponse } from "./editor-record-utils.js";
import { runExclusiveWorkspaceMutation, type WorkspaceMutationInput } from "./editor-workspace-mutation-context.js";
import type { AddPolicyResponse, JsonRecord } from "./types.js";
import { clearWorkspaceHistory } from "./workspace-history.js";

export function createAddPolicyAction(input: WorkspaceMutationInput): () => Promise<void> {
  return async (): Promise<void> => {
    const name = input.newPolicyName.trim();
    if (input.newPolicyPlatform.length === 0 || name.length === 0) {
      input.setActionErrorStatus("Policy name and operating system are required");
      return;
    }
    await runExclusiveWorkspaceMutation(input, async (request) => {
      if (await input.ensureSavedWorkspace(request) === undefined) return;
      const response = await postJson("/api/add-policy", { platform: input.newPolicyPlatform, name });
      const result = await readJsonResponse<AddPolicyResponse | JsonRecord>(response);
      if (!response.ok) {
        if (input.requestGuard.isExclusiveCurrent(request)) input.setActionErrorStatus(`Policy creation blocked: ${JSON.stringify(result)}`);
        return;
      }
      if (!input.requestGuard.isExclusiveCurrent(request)) return;
      const added = result as AddPolicyResponse;
      const policyIndex = added.workspace.policies.findIndex((candidate) => candidate.path === added.policyPath);
      input.setState((current) => current === undefined ? current : { ...current, workspace: added.workspace, validation: added.validation });
      input.setIsDirty(false);
      clearWorkspaceHistory(input.historyInput);
      input.setHasFreshBuild(false);
      input.setSelection({ policyIndex: policyIndex >= 0 ? policyIndex : added.workspace.policies.length - 1, versionIndex: 0 });
      input.setSelectedType("");
      input.setNewPolicyName("");
      input.setActionSuccessStatus(`Created ${name}`);
    }, "Policy creation failed");
  };
}
