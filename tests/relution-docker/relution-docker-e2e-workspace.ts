// Supports Relution Docker end-to-end test scenarios and helpers.
import type { PolicyWorkspace } from "../../src/workspace.js";

export function requirePolicyPath(workspace: PolicyWorkspace): string {
  const policyPath = workspace.policies[0]?.path;
  if (policyPath === undefined) {
    throw new Error("Workspace has no policy path");
  }
  return policyPath;
}

export function requireImportedWorkspace(
  workspace: PolicyWorkspace | undefined,
  label: string,
): PolicyWorkspace {
  if (workspace === undefined) {
    throw new Error(`${label}: ruleset import did not create a workspace`);
  }
  return workspace;
}

export function workspaceHasConfigurationType(
  workspace: PolicyWorkspace,
  type: string,
): boolean {
  return workspace.policies.some((policy) => {
    const versions = Array.isArray(policy.document.versions) ? policy.document.versions : [];
    return versions.some((version) => {
      const versionRecord = objectRecord(version);
      const configurations = Array.isArray(versionRecord?.configurations)
        ? versionRecord.configurations
        : [];
      return configurations.some((configuration) => {
        const details = objectRecord(configuration)?.details;
        return objectRecord(details)?.type === type;
      });
    });
  });
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
