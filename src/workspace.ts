/** Public workspace facade: contracts, lifecycle, persistence, and mutation exports. */
import { assertPersistableWorkspaceShape, loadPersistedWorkspace, savePersistedWorkspace } from "./workspace-storage.js";
import type { PolicyWorkspace } from "./workspace-types.js";

export { WorkspaceInputError } from "./workspace-input-values.js";
export { MAX_WORKSPACE_JSON_BYTES, MAX_WORKSPACE_POLICY_FILES, MAX_WORKSPACE_TOTAL_JSON_BYTES } from "./workspace-storage.js";
export type {
  AddAppleCompatConfigurationOptions,
  AddAppleSchemaProfileOptions,
  AddConfigurationOptions,
  AddCustomSettingsOptions,
  AddPolicyOptions,
  AddPolicyResult,
  ConfigurationPositionOptions,
  MoveConfigurationOptions,
  NewWorkspaceOptions,
  PolicyWorkspace,
  SchemaCompatibilityIssue,
  WorkspacePolicy,
  WorkspaceValidationError,
  WorkspaceValidationResult,
} from "./workspace-types.js";
export { createNewWorkspace } from "./workspace-creation.js";

export function loadWorkspace(workspaceDir: string): PolicyWorkspace { return loadPersistedWorkspace(workspaceDir); }
export function saveWorkspace(workspaceDir: string, workspace: PolicyWorkspace): void { assertPersistableWorkspace(workspace); savePersistedWorkspace(workspaceDir, workspace); }
export function assertPersistableWorkspace(workspace: PolicyWorkspace): void { assertPersistableWorkspaceShape(workspace); }
export { validateWorkspace, schemaCompatibilityIssues } from "./workspace-validation.js";
export { addAppleCompatConfigurationToWorkspace, addAppleSchemaProfileToWorkspace, addConfigurationToWorkspace, addCustomSettingsToWorkspace, addPolicyToWorkspace, createConfiguration, moveConfigurationInWorkspace, removeConfigurationFromWorkspace } from "./workspace-actions.js";
