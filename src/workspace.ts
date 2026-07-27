/** Public workspace facade: contracts, lifecycle, persistence, and mutation exports. */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { parse } from "node:path";
import type { CustomSettingsInput } from "./apple-schema.js";
import type { JsonRecord } from "./utils/json-guards.js";
import { resolveSymlinkFreePath } from "./utils/path-safety.js";
import { assertSupportedWorkspacePlatform, WorkspaceInputError } from "./workspace-input-values.js";
import { createWorkspaceExportReport, createWorkspaceMetadata, createWorkspacePolicyEntry } from "./workspace-model.js";
import { assertPersistableWorkspaceShape, loadPersistedWorkspace, savePersistedWorkspace } from "./workspace-storage.js";

export interface PolicyWorkspace { metadata: JsonRecord; report: JsonRecord; policies: WorkspacePolicy[]; }
export interface WorkspacePolicy { path: string; document: JsonRecord; }
export { WorkspaceInputError } from "./workspace-input-values.js";
export { MAX_WORKSPACE_JSON_BYTES, MAX_WORKSPACE_POLICY_FILES, MAX_WORKSPACE_TOTAL_JSON_BYTES } from "./workspace-storage.js";
export interface WorkspaceValidationResult { ok: boolean; errors: WorkspaceValidationError[]; schemaCompatibilityIssueCount?: number; schemaCompatibilityIssues?: SchemaCompatibilityIssue[]; }
export interface WorkspaceValidationError { path: string; message: string; }
export interface SchemaCompatibilityIssue { schemaName: string; path: string; kind: "invalid-pattern"; pattern: string; message: string; }
export interface NewWorkspaceOptions { platform: string; name: string; workspace: string; serverVersion: string; force?: boolean; /** Internal audit lane for declared unsupported template platforms. */ allowUnknownPlatform?: boolean; }
export interface AddConfigurationOptions { policyPath: string; versionIndex: number; type: string; }
export interface AddAppleCompatConfigurationOptions { policyPath: string; versionIndex: number; settingId: string; }
export interface AddAppleSchemaProfileOptions { policyPath: string; versionIndex: number; schemaId: string; }
export interface AddCustomSettingsOptions extends CustomSettingsInput { policyPath: string; versionIndex: number; }
export interface ConfigurationPositionOptions { policyPath: string; versionIndex: number; configurationIndex: number; }
export interface MoveConfigurationOptions extends ConfigurationPositionOptions { direction: "up" | "down"; }
export interface AddPolicyOptions { platform: string; name: string; }
export interface AddPolicyResult { workspace: PolicyWorkspace; policyPath: string; }

export function createNewWorkspace(options: NewWorkspaceOptions): PolicyWorkspace {
  validateNewWorkspaceOptions(options); prepareWorkspace(options.workspace, options.force === true);
  const uuid = randomUUID().toUpperCase(); const policy = createWorkspacePolicyEntry({ uuid, versionUuid: randomUUID().toUpperCase(), now: Date.now(), name: options.name, platform: options.platform, description: "" });
  const workspace = { metadata: createWorkspaceMetadata(options.serverVersion), report: createWorkspaceExportReport([{ uuid, name: options.name }]), policies: [policy] };
  saveWorkspace(options.workspace, workspace); return workspace;
}

export function loadWorkspace(workspaceDir: string): PolicyWorkspace { return loadPersistedWorkspace(workspaceDir); }
export function saveWorkspace(workspaceDir: string, workspace: PolicyWorkspace): void { assertPersistableWorkspace(workspace); savePersistedWorkspace(workspaceDir, workspace); }
export function assertPersistableWorkspace(workspace: PolicyWorkspace): void { assertPersistableWorkspaceShape(workspace); }
export { validateWorkspace, schemaCompatibilityIssues } from "./workspace-validation.js";
export { addAppleCompatConfigurationToWorkspace, addAppleSchemaProfileToWorkspace, addConfigurationToWorkspace, addCustomSettingsToWorkspace, addPolicyToWorkspace, createConfiguration, moveConfigurationInWorkspace, removeConfigurationFromWorkspace } from "./workspace-actions.js";

function validateNewWorkspaceOptions(options: NewWorkspaceOptions): void {
  if (options.name.trim().length === 0) throw new WorkspaceInputError("Policy name must not be empty");
  assertSupportedWorkspacePlatform(options.platform, options.allowUnknownPlatform === true ? { allowUnknown: true } : {});
  if (options.workspace.trim().length === 0) throw new WorkspaceInputError("Workspace path must not be empty");
  if (options.serverVersion.trim().length === 0) throw new WorkspaceInputError("Server version must not be empty");
}

function prepareWorkspace(workspaceDir: string, force: boolean): void {
  const root = resolveSymlinkFreePath(workspaceDir, "Workspace path");
  if (root === parse(root).root) throw new WorkspaceInputError("Workspace path must not be the filesystem root");
  if (existsSync(root)) assertWorkspaceDirectory(root, workspaceDir, force);
  mkdirSync(root, { recursive: true, mode: 0o700 });
}

function assertWorkspaceDirectory(root: string, displayedPath: string, force: boolean): void {
  if (!statSync(root).isDirectory()) throw new Error(`Workspace path is not a directory: ${displayedPath}`);
  const entries = readdirSync(root);
  if (entries.length > 0 && !force) throw new Error(`Workspace directory is not empty: ${displayedPath}`);
  const managed = ["metadata.json", "report.json", "policies"];
  const unexpected = entries.some((entry) => ![...managed, "editor-sidecar.json"].includes(entry));
  if (entries.length > 0 && force && (unexpected || !managed.every((entry) => entries.includes(entry)))) throw new Error(`Refusing to force-create over a non-workspace directory: ${displayedPath}`);
}
