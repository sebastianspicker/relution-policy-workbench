/** Creates workspace directories and their initial managed policy surface. */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { parse } from "node:path";
import { resolveSymlinkFreePath } from "./utils/path-safety.js";
import { assertSupportedWorkspacePlatform, WorkspaceInputError } from "./workspace-input-values.js";
import { createWorkspaceExportReport, createWorkspaceMetadata, createWorkspacePolicyEntry } from "./workspace-model.js";
import { assertPersistableWorkspaceShape, savePersistedWorkspace } from "./workspace-storage.js";
import type { NewWorkspaceOptions, PolicyWorkspace } from "./workspace-types.js";

export function createNewWorkspace(options: NewWorkspaceOptions): PolicyWorkspace {
  validateNewWorkspaceOptions(options); prepareWorkspace(options.workspace, options.force === true);
  const uuid = randomUUID().toUpperCase(); const policy = createWorkspacePolicyEntry({ uuid, versionUuid: randomUUID().toUpperCase(), now: Date.now(), name: options.name, platform: options.platform, description: "" });
  const workspace = { metadata: createWorkspaceMetadata(options.serverVersion), report: createWorkspaceExportReport([{ uuid, name: options.name }]), policies: [policy] };
  assertPersistableWorkspaceShape(workspace); savePersistedWorkspace(options.workspace, workspace); return workspace;
}

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
