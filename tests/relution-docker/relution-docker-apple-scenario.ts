// Supports Relution Docker end-to-end test scenarios and helpers.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractRexp, inspectRexp, packPlainDirectory, verifyRexp } from "../../src/rexp.js";
import { loadTemplateBundle } from "../../src/templates.js";
import {
  addAppleCompatConfigurationToWorkspace,
  addConfigurationToWorkspace,
  createNewWorkspace,
  loadWorkspace,
} from "../../src/workspace.js";
import {
  archiveSecret,
  configurationsHaveType,
  firstImportedPolicyUuid,
  importPolicy,
  publishFirstPolicyVersion,
  requirePolicyPath,
  runRelutionScenario,
  waitForPublishedConfigurations,
  writeVerifiedExportedPolicy,
  workspaceHasConfigurationType,
} from "./relution-docker-e2e-helpers.js";

export async function runAppleMobileconfigScenario(): Promise<void> {
  await runRelutionScenario(240, async () => {
    const bundle = loadTemplateBundle();
    const root = mkdtempSync(join(tmpdir(), "relution-docker-e2e-"));
    const workspaceDir = join(root, "workspace");
    const rexpPath = join(root, "apple-gap.rexp");
    const exportedPath = join(root, "apple-gap-exported.rexp");
    const exportedWorkspaceDir = join(root, "exported-workspace");
    const workspace = createNewWorkspace({
      workspace: workspaceDir,
      platform: "IOS",
      name: "Docker E2E Apple Gap",
      serverVersion: bundle.serverVersion,
      force: true,
    });
    addConfigurationToWorkspace(workspaceDir, bundle, {
      policyPath: requirePolicyPath(workspace),
      versionIndex: 0,
      type: "IOS_RESTRICTION",
    });
    addAppleCompatConfigurationToWorkspace(workspaceDir, {
      policyPath: requirePolicyPath(workspace),
      versionIndex: 0,
      settingId: "associated-domains",
    });
    packPlainDirectory(workspaceDir, rexpPath, archiveSecret, { force: true });
    assert.equal(verifyRexp(rexpPath, archiveSecret).ok, true);

    const importReport = await importPolicy(rexpPath);
    assert.deepEqual(importReport.errors ?? [], []);
    assert.equal(Object.keys(importReport.failedPolicies ?? {}).length, 0);
    const importedPolicyUuid = firstImportedPolicyUuid(importReport);
    assert.equal(typeof importedPolicyUuid, "string");
    const publishedVersionUuid = await publishFirstPolicyVersion(importedPolicyUuid);
    const serverConfigurations = await waitForPublishedConfigurations(
      importedPolicyUuid,
      publishedVersionUuid,
    );
    assert.equal(configurationsHaveType(serverConfigurations, "IOS_RESTRICTION"), true);
    assert.equal(configurationsHaveType(serverConfigurations, "APPLE_MOBILECONFIG"), true);
    assert.equal(
      serverConfigurations.some(
        (configuration) =>
          configuration.details?.type === "APPLE_MOBILECONFIG"
          && configuration.details.secondLevelPayloadType === "com.apple.associated-domains"
          && typeof configuration.details.rawContent === "string"
          && configuration.details.rawContent.includes(
            "<string>com.apple.associated-domains</string>",
          ),
      ),
      true,
    );

    await writeVerifiedExportedPolicy(importedPolicyUuid, exportedPath);
    const exported = inspectRexp(exportedPath, archiveSecret);
    assert.equal(
      exported.policies?.some((policy) => policy.name === "Docker E2E Apple Gap"),
      true,
    );
    extractRexp(exportedPath, exportedWorkspaceDir, archiveSecret, { force: true, pretty: true });
    const exportedWorkspace = loadWorkspace(exportedWorkspaceDir);
    assert.equal(workspaceHasConfigurationType(exportedWorkspace, "IOS_RESTRICTION"), true);
    assert.equal(
      workspaceHasConfigurationType(exportedWorkspace, "APPLE_MOBILECONFIG"),
      false,
      "Relution 26.1.1 stores APPLE_MOBILECONFIG after import, but marks it non-exportable for policy .rexp export.",
    );
  });
}
