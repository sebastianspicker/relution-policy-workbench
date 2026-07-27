/** Provides canonical workspace and catalog fixtures for compliance scenarios. */
import type { AppleSchemaCatalog } from "../src/apple-schema.js";
import { createAppleSchemaCounts } from "../src/apple-schema-catalog-identifiers.js";
import type { PolicyWorkspace } from "../src/workspace.js";

export { createTestTemplateBundle } from "./relution-template-test-fixtures.js";

export function createTestAppleSchemaCatalog(): AppleSchemaCatalog {
  return {
    version: 1,
    source: {
      repository: "apple/device-management",
      revision: "test",
      generatedAt: "2026-04-24T00:00:00.000Z",
    },
    counts: createAppleSchemaCounts([]),
    entries: [],
  };
}

export function createTestPolicyWorkspace(options: {
  readonly platform?: string;
  readonly name?: string;
  readonly configurations?: Array<Record<string, unknown>>;
} = {}): PolicyWorkspace {
  const platform = options.platform ?? "IOS";
  return {
    metadata: {},
    report: {},
    policies: [
      {
        path: "policies/policy_test.json",
        document: {
          name: options.name ?? `${platform} policy`,
          platform,
          versions: [
            {
              configurations: (options.configurations ?? []).map((details, index) => ({
                uuid: `configuration-${String(index)}`,
                details: { uuid: `details-${String(index)}`, ...details },
              })),
            },
          ],
        },
      },
    ],
  };
}
