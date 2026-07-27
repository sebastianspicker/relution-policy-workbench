/** Edits the selected configuration through structured or raw JSON state. */
import { asRecord, cloneWorkspace, versionRecord } from "./editor-utils.js";
import type { PolicyEditingActionsInput } from "./editor-policy-actions.js";
import type { JsonRecord } from "./types.js";

export function createConfigurationEditingActions(input: PolicyEditingActionsInput) {
  function updateSelectedConfiguration(nextConfiguration: JsonRecord): boolean {
    if (input.selection === undefined || input.selection.configurationIndex === undefined) return false;
    const nextWorkspace = cloneWorkspace(input.currentState.workspace);
    const version = versionRecord(nextWorkspace, input.selection.policyIndex, input.selection.versionIndex);
    const configurations = Array.isArray(version?.configurations) ? version.configurations : [];
    configurations[input.selection.configurationIndex] = nextConfiguration;
    return input.markWorkspaceDirty(nextWorkspace, input.selection, "Updated configuration");
  }

  function applyRawJson(): void {
    if (input.selection === undefined || input.selection.configurationIndex === undefined || input.configuration === undefined) {
      input.setActionErrorStatus("Select a configuration before applying raw JSON");
      return;
    }
    try {
      const nextConfiguration = asRecord(JSON.parse(input.rawJson) as unknown);
      if (nextConfiguration === undefined) {
        input.setActionErrorStatus("Raw JSON must be an object");
        return;
      }
      if (!updateSelectedConfiguration(nextConfiguration)) return;
      input.setRawJsonState(JSON.stringify(nextConfiguration, null, 2));
      input.setRawJsonDirty(false);
      input.setActionSuccessStatus("Applied raw JSON");
    } catch (error) {
      input.setActionErrorStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function setRawJson(value: string): void {
    input.setRawJsonState(value);
    input.setRawJsonDirty(value !== input.canonicalRawJson);
  }

  function resetRawJson(): void {
    input.setRawJsonState(input.canonicalRawJson);
    input.setRawJsonDirty(false);
  }

  return { updateSelectedConfiguration, applyRawJson, setRawJson, resetRawJson };
}
