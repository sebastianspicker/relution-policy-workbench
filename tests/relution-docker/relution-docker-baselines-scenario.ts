// Supports Relution Docker end-to-end test scenarios and helpers.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAppleSchemaCatalog } from "../../src/apple-schema-catalog.js";
import { inspectRexp, packPlainDirectory, verifyRexp } from "../../src/rexp.js";
import { loadTemplateBundle } from "../../src/templates.js";
import { saveWorkspace } from "../../src/workspace.js";
import { importRulesetWorkspace } from "../../web/src/editor/ruleset-import.js";
import {
  archiveSecret,
  baselineTemplateEntries,
  configurationsHaveType,
  expectedServerConfigurationTypes,
  importBaselineTemplate,
  importedPolicyUuidByName,
  isRelutionExportablePolicy,
  publishFirstPolicyVersion,
  readJson,
  requireImportedWorkspace,
  runRelutionScenario,
  waitForPublishedConfigurationsWithTypes,
  writeVerifiedExportedPolicy,
  type BaselineTemplate,
} from "./relution-docker-e2e-helpers.js";

export async function runBaselineTemplatesScenario(): Promise<void> {
  await runRelutionScenario(360, async () => {
    const bundle = loadTemplateBundle();
    const appleSchema = loadAppleSchemaCatalog();
    const root = mkdtempSync(join(tmpdir(), "relution-baseline-e2e-"));
    const entries = baselineTemplateEntries();

    for (const [entryIndex, entry] of entries.entries()) {
      const label = `${String(entryIndex + 1)}/${String(entries.length)} ${entry.path}`;
      const template = readJson<BaselineTemplate>(entry.path);
      const importResult = importRulesetWorkspace(template, bundle, appleSchema);
      assert.deepEqual(importResult.report.conflicts, [], `${label}: ruleset conflicts`);
      assert.deepEqual(importResult.report.unresolved, [], `${label}: unresolved rules`);
      assert.notEqual(importResult.workspace, undefined, `${label}: workspace`);
      const workspace = requireImportedWorkspace(importResult.workspace, label);

      const templateLabel = entry.path.replaceAll("/", "-").replaceAll(".", "-");
      const workspaceDir = join(root, `${templateLabel}-workspace`);
      const rexpPath = join(root, `${templateLabel}.rexp`);
      saveWorkspace(workspaceDir, workspace);
      packPlainDirectory(workspaceDir, rexpPath, archiveSecret, { force: true });
      assert.equal(verifyRexp(rexpPath, archiveSecret).ok, true, `${label}: local rexp verification`);
      const localArchive = inspectRexp(rexpPath, archiveSecret);
      assert.equal(
        localArchive.policies?.some((policy) => policy.name === template.policies[0]?.name),
        true,
        `${label}: local archive policy`,
      );
      await verifyImportedTemplate(root, templateLabel, label, template, rexpPath);
    }
  });
}

async function verifyImportedTemplate(
  root: string,
  templateLabel: string,
  label: string,
  template: BaselineTemplate,
  rexpPath: string,
): Promise<void> {
  const importReport = await importBaselineTemplate(rexpPath, label);
  for (const policy of template.policies) {
    const policyUuid = importedPolicyUuidByName(importReport, policy.name);
    const versionUuid = await publishFirstPolicyVersion(policyUuid);
    const expectedTypes = expectedServerConfigurationTypes(policy);
    const serverConfigurations = await waitForPublishedConfigurationsWithTypes(
      policyUuid,
      versionUuid,
      expectedTypes,
    );
    for (const type of expectedTypes) {
      assert.equal(
        configurationsHaveType(serverConfigurations, type),
        true,
        `${label}: ${policy.name}: server configuration ${type}`,
      );
    }
    await verifyExportedPolicy(root, templateLabel, label, policyUuid, policy.name, expectedTypes);
  }
}

async function verifyExportedPolicy(
  root: string,
  templateLabel: string,
  label: string,
  policyUuid: string,
  policyName: string,
  expectedTypes: string[],
): Promise<void> {
  const exportedPath = join(root, `${templateLabel}-${policyUuid}-exported.rexp`);
  await writeVerifiedExportedPolicy(
    policyUuid,
    exportedPath,
    `${label}: ${policyName}: exported rexp verification`,
  );
  const exported = inspectRexp(exportedPath, archiveSecret);
  if (isRelutionExportablePolicy(expectedTypes)) {
    assert.equal(
      exported.policies?.some((exportedPolicy) => exportedPolicy.name === policyName),
      true,
      `${label}: ${policyName}: exported archive policy`,
    );
  }
}
