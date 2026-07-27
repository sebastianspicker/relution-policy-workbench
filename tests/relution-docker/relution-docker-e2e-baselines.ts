// Supports Relution Docker end-to-end test scenarios and helpers.
import type {
  BaselinePolicy,
  BaselineTemplateIndex,
  BaselineTemplateIndexEntry,
} from "./relution-docker-e2e-types.js";
import { readJson } from "../rexp-helpers.js";

export function baselineTemplateEntries(): BaselineTemplateIndexEntry[] {
  const index = readJson<BaselineTemplateIndex>("example/relution-baseline-templates/index.json");
  return [
    ...index.consolidatedTemplates,
    ...index.modularBundleTemplates,
    ...index.modularTemplates,
    ...index.tieredConsolidatedTemplates,
    ...index.tieredModularBundleTemplates,
    ...index.tieredModularTemplates,
  ];
}

export function expectedServerConfigurationTypes(policy: BaselinePolicy): string[] {
  const expected = new Set<string>();
  for (const rule of policy.rules) {
    for (const mapping of rule.mappings ?? []) {
      if (mapping.kind === "relution-native") {
        expected.add(mapping.type);
      } else {
        expected.add("APPLE_MOBILECONFIG");
      }
    }
  }
  if (expected.size === 0) {
    throw new Error(`Baseline policy has no actionable mappings: ${policy.name}`);
  }
  return [...expected].sort();
}

export function isRelutionExportablePolicy(expectedTypes: string[]): boolean {
  return expectedTypes.some((type) => type !== "APPLE_MOBILECONFIG");
}
