/** Adds custom MACOS settings through the common workspace persistence boundary. */
import { createCustomSettingsConfiguration } from "./apple-schema.js";
import { stringValue } from "./utils/json-guards.js";
import { configurationTarget } from "./workspace-configuration-target.js";
import { loadWorkspace, saveWorkspace, WorkspaceInputError, type AddCustomSettingsOptions, type PolicyWorkspace } from "./workspace.js";
export function addCustomSettingsToWorkspace(path: string, options: AddCustomSettingsOptions): PolicyWorkspace { const workspace = loadWorkspace(path); const target = configurationTarget(workspace, options); if (stringValue(target.policy.document.platform) !== "MACOS") throw new WorkspaceInputError(`Application & Custom Settings is compatible with MACOS policies, not ${String(target.policy.document.platform)}`); target.configurations.push(createCustomSettingsConfiguration(options)); saveWorkspace(path, workspace); return workspace; }
