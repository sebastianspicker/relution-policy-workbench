/** Exercises fail-closed sidecar restoration when workspace identities are ambiguous. */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileMobileConfigRestoreEntries, type EditorSidecarState } from "../src/sidecar.js";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace, type PolicyWorkspace } from "../src/workspace.js";

test("restoration uses an exact policy path before an ambiguous name-platform fallback", () => {
  const workspace = newWorkspace();
  const original = workspace.policies[0]!;
  workspace.policies.push({ ...structuredClone(original), path: "policies/policy_SECOND.json" });
  const entry = restoreEntry(original.path);
  const restored = reconcileMobileConfigRestoreEntries(workspace, withEntries(entry));

  assert.equal(configurationCount(restored, original.path), 1);
  assert.equal(configurationCount(restored, "policies/policy_SECOND.json"), 0);
});

test("restoration fails closed when name-platform fallback is ambiguous", () => {
  const workspace = newWorkspace();
  const original = workspace.policies[0]!;
  workspace.policies.push({ ...structuredClone(original), path: "policies/policy_SECOND.json" });
  const restored = reconcileMobileConfigRestoreEntries(workspace, withEntries(restoreEntry("policies/missing.json")));

  assert.equal(configurationCount(restored, original.path), 0);
  assert.equal(configurationCount(restored, "policies/policy_SECOND.json"), 0);
});

test("restoration rejects duplicate target version UUIDs without mutating either version", () => {
  const workspace = newWorkspace();
  const policy = workspace.policies[0]!;
  const versions = policy.document.versions as Array<Record<string, unknown>>;
  const first = versions[0]!;
  first.uuid = "DUPLICATE-VERSION";
  first.configurations = [];
  versions.push({ ...structuredClone(first), configurations: [] });
  const restored = reconcileMobileConfigRestoreEntries(workspace, withEntries(restoreEntry(policy.path, "DUPLICATE-VERSION")));

  assert.equal(configurationCount(restored, policy.path), 0);
});

test("restoration deep-clones inserted configurations", () => {
  const workspace = newWorkspace();
  const entry = restoreEntry(workspace.policies[0]!.path);
  const restored = reconcileMobileConfigRestoreEntries(workspace, withEntries(entry));
  (entry.configuration.details as Record<string, unknown>).nested = "mutated after reconciliation";
  const inserted = firstConfiguration(restored);

  assert.deepEqual(inserted, { uuid: "CONFIG-RESTORE-1", details: { type: "APPLE_MOBILECONFIG", nested: "original" } });
});

function newWorkspace(): PolicyWorkspace {
  const root = mkdtempSync(join(tmpdir(), "relution-sidecar-reconcile-"));
  const bundle = loadTemplateBundle();
  return createNewWorkspace({ workspace: root, platform: "IOS", name: "Sidecar reconcile", serverVersion: bundle.serverVersion });
}

function withEntries(...mobileConfigRestore: EditorSidecarState["mobileConfigRestore"]): EditorSidecarState {
  return { version: 1, mobileConfigRestore, ddmArtifacts: [], mdmCommandArtifacts: [], customManifests: [] };
}

function restoreEntry(policyPath: string, versionUuid?: string): EditorSidecarState["mobileConfigRestore"][number] {
  return {
    policyPath,
    policyName: "Sidecar reconcile",
    platform: "IOS",
    configurationUuid: "CONFIG-RESTORE-1",
    ...(versionUuid === undefined ? {} : { versionUuid }),
    versionIndex: 0,
    payloadType: "com.example.test",
    displayName: "Test",
    signatureState: "unsigned",
    configuration: { uuid: "CONFIG-RESTORE-1", details: { type: "APPLE_MOBILECONFIG", nested: "original" } },
  };
}

function configurationCount(workspace: PolicyWorkspace, path: string): number {
  const policy = workspace.policies.find((candidate) => candidate.path === path);
  const versions = Array.isArray(policy?.document.versions) ? policy.document.versions : [];
  return versions.reduce((count, version) => {
    const configurations = isRecord(version) && Array.isArray(version.configurations) ? version.configurations : [];
    return count + configurations.length;
  }, 0);
}

function firstConfiguration(workspace: PolicyWorkspace): unknown {
  const versions = workspace.policies[0]!.document.versions;
  const version = Array.isArray(versions) && isRecord(versions[0]) ? versions[0] : undefined;
  return Array.isArray(version?.configurations) ? version.configurations[0] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
