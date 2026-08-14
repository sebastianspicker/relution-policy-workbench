/** Provides workspace mutation and marker helpers for editor tests. */
import assert from "node:assert/strict";
import type { PolicyWorkspace } from "../src/workspace.js";

export function expandWorkspace(workspace: PolicyWorkspace, policyCount: number): PolicyWorkspace {
  const templatePolicy = workspace.policies[0];
  if (templatePolicy === undefined) throw new Error("Workspace has no template policy");
  const expanded = structuredClone(workspace) as PolicyWorkspace;
  const exportedPolicies: Record<string, unknown> = {};
  const policiesToExport: string[] = [];
  expanded.policies = Array.from({ length: policyCount }, (_unused, index) => {
    const sequence = String(index + 1).padStart(12, "0");
    const policyUuid = `00000000-0000-4000-8000-${sequence}`;
    const versionUuid = `00000000-0000-4001-8000-${sequence}`;
    const policy = structuredClone(templatePolicy);
    policy.path = `policies/policy_${policyUuid}.json`;
    policy.document.uuid = policyUuid;
    policy.document.name = `Large Validate Policy ${sequence}`;
    policy.document.description = "Large validation fixture padding ".repeat(100);
    const firstVersion = Array.isArray(policy.document.versions) ? policy.document.versions[0] : undefined;
    if (typeof firstVersion === "object" && firstVersion !== null && !Array.isArray(firstVersion)) (firstVersion as Record<string, unknown>).uuid = versionUuid;
    policiesToExport.push(policyUuid);
    exportedPolicies[policyUuid] = { policyUuid, policyName: policy.document.name, result: "SUCCESS", errors: [] };
    return policy;
  });
  expanded.report = { ...expanded.report, policiesToExport, exportedPolicies, failedPolicies: {} };
  return expanded;
}

export function workspaceWithPolicyMarker(workspace: PolicyWorkspace, marker: string): PolicyWorkspace {
  const marked = structuredClone(workspace) as PolicyWorkspace;
  const policy = marked.policies[0];
  if (policy === undefined) throw new Error("Workspace has no policy to mark");
  const policyUuid = policy.document.uuid;
  if (typeof policyUuid !== "string") throw new Error("Workspace policy has no UUID");
  const policyName = `Concurrent ${marker}`;
  policy.document.name = policyName;
  marked.metadata.concurrentSaveMarker = marker;
  const exportedPolicies = typeof marked.report.exportedPolicies === "object" && marked.report.exportedPolicies !== null && !Array.isArray(marked.report.exportedPolicies)
    ? marked.report.exportedPolicies as Record<string, unknown>
    : undefined;
  const exportedPolicy = exportedPolicies?.[policyUuid];
  if (typeof exportedPolicy !== "object" || exportedPolicy === null || Array.isArray(exportedPolicy)) throw new Error("Workspace report has no exported policy entry");
  (exportedPolicy as Record<string, unknown>).policyName = policyName;
  return marked;
}

export function workspacePolicyMarker(workspace: PolicyWorkspace): string {
  const marker = workspace.metadata.concurrentSaveMarker;
  if (typeof marker !== "string") throw new Error("Workspace has no concurrent save marker");
  assertWorkspacePolicyMarker(workspace, marker);
  return marker;
}

export function assertWorkspacePolicyMarker(workspace: PolicyWorkspace, marker: string): void {
  const policy = workspace.policies[0];
  assert.notEqual(policy, undefined);
  const policyUuid = policy?.document.uuid;
  assert.equal(typeof policyUuid, "string");
  const policyName = `Concurrent ${marker}`;
  assert.equal(workspace.metadata.concurrentSaveMarker, marker);
  assert.equal(policy?.document.name, policyName);
  const exportedPolicies = workspace.report.exportedPolicies;
  assert.equal(typeof exportedPolicies, "object");
  assert.notEqual(exportedPolicies, null);
  assert.equal(Array.isArray(exportedPolicies), false);
  const exportedPolicy = (exportedPolicies as Record<string, unknown>)[policyUuid as string] as Record<string, unknown> | undefined;
  assert.equal(exportedPolicy?.policyName, policyName);
}

export function clearFirstPolicyConfigurations(workspace: PolicyWorkspace): void {
  const firstPolicy = workspace.policies[0];
  const firstVersion = Array.isArray(firstPolicy?.document.versions) ? firstPolicy.document.versions[0] : undefined;
  if (typeof firstVersion === "object" && firstVersion !== null && !Array.isArray(firstVersion)) {
    (firstVersion as Record<string, unknown>).configurations = [];
  }
}
