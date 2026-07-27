/** Adds fully initialized policies and matching report entries. */
import { randomUUID } from "node:crypto";
import type { RelutionTemplateBundle } from "./templates.js";
import { assertSupportedWorkspacePlatform } from "./workspace-input-values.js";
import { createWorkspacePolicyEntry, recordPolicyInWorkspaceExportReport } from "./workspace-model.js";
import { loadWorkspace, saveWorkspace, WorkspaceInputError, type AddPolicyOptions, type AddPolicyResult } from "./workspace.js";
export function addPolicyToWorkspace(path: string, bundle: RelutionTemplateBundle, options: AddPolicyOptions): AddPolicyResult { if (options.name.trim().length === 0) throw new WorkspaceInputError("Policy name must not be empty"); assertSupportedWorkspacePlatform(options.platform, { allowed: bundle.platforms }); const workspace = loadWorkspace(path); const uuid = randomUUID().toUpperCase(); const name = options.name.trim(); const policy = createWorkspacePolicyEntry({ uuid, versionUuid: randomUUID().toUpperCase(), now: Date.now(), name, platform: options.platform, description: "" }); workspace.policies.push(policy); recordPolicyInWorkspaceExportReport(workspace.report, { uuid, name }); saveWorkspace(path, workspace); return { workspace, policyPath: policy.path }; }
