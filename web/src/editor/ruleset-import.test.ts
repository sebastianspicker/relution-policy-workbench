/** Verifies ruleset imports are deterministic, non-mutating, and safe to apply as a workspace. */
import { describe, expect, it } from "vitest";
import type { AppleSchemaCatalog } from "../../../src/apple-schema.js";
import type { RelutionTemplateBundle } from "../../../src/templates.js";
import { createTestTemplateBundle } from "../../../tests/compliance-fixtures.js";
import { emptyAppleSchemaCatalog } from "./editor-record-utils.js";
import { importRulesetWorkspace } from "./ruleset-import.js";

describe("importRulesetWorkspace", () => {
  it("keeps structural validation errors exact", () => {
    const bundle = createBundle();
    const catalog = createAppleSchemaCatalog();

    expect(() => importRulesetWorkspace({}, bundle, catalog)).toThrow("Ruleset JSON must include version 1, name, and policies");
    expect(() => importRulesetWorkspace({ version: 1, name: "Ruleset", policies: [{}] }, bundle, catalog)).toThrow(
      "Ruleset policy 1 must include platform, name, and rules",
    );
    expect(() => importRulesetWorkspace({ version: 1, name: "Ruleset", policies: [{ platform: "IOS", name: "Policy", rules: [{}] }] }, bundle, catalog)).toThrow(
      "Rule 1.1 must include id and title",
    );
    expect(() => importRulesetWorkspace({ version: 1, name: "Ruleset", policies: [{ platform: "IOS", name: "Policy", rules: [{ id: "rule", title: "Rule", mappings: [{}] }] }] }, bundle, catalog)).toThrow(
      "Mapping rule.1 must include kind",
    );
  });

  it("retains applied, unresolved, and conflict order", () => {
    const bundle = createBundle();
    const singleConfigurationBundle: RelutionTemplateBundle = {
      ...bundle,
      configurationTypes: [{ ...bundle.configurationTypes[0]!, multiConfig: false }],
    };
    const result = importRulesetWorkspace(
      createRuleset([
        { id: "first", values: {} },
        { id: "unresolved", values: {}, mapped: false },
        { id: "third", values: {} },
      ]),
      singleConfigurationBundle,
      createAppleSchemaCatalog(),
      { now: 1, uuidFactory: sequentialUuid() },
    );

    expect(result.workspace).toBeUndefined();
    expect(result.report.applied.map((entry) => entry.ruleId)).toEqual(["first"]);
    expect(result.report.unresolved.map((entry) => entry.ruleId)).toEqual(["unresolved"]);
    expect(result.report.conflicts).toEqual(["Mutation guard policy/third: IOS_RESTRICTION is not multi-config and was mapped more than once"]);
  });

  it("does not mutate shared mapping values when creating configuration envelopes", () => {
    const { result, values } = importRulesetWithSharedMappingValues();

    expect(result.workspace).toBeDefined();
    expect(values).toEqual({ name: "Shared camera rule" });
  });

  it("creates distinct details UUIDs when the same mapping values object is reused", () => {
    const { result } = importRulesetWithSharedMappingValues();
    const document = result.workspace?.policies[0]?.document as { versions?: Array<{ configurations?: Array<{ details?: { uuid?: string } }> }> } | undefined;
    const configurations = document?.versions?.[0]?.configurations;

    expect(configurations?.map((configuration) => configuration.details?.uuid)).toEqual(["uuid-3", "uuid-5"]);
  });
});

function importRulesetWithSharedMappingValues() {
  const values = { name: "Shared camera rule" };
  const ruleset = createRuleset([
    { id: "rule-one", values },
    { id: "rule-two", values },
  ]);
  const result = importRulesetWorkspace(ruleset, createBundle(), createAppleSchemaCatalog(), {
    now: 1,
    uuidFactory: sequentialUuid(),
  });
  return { result, values };
}

function createRuleset(rules: Array<{ id: string; values: Record<string, unknown>; mapped?: boolean }>): unknown {
  return {
    version: 1,
    name: "Mutation guard ruleset",
    policies: [
      {
        platform: "IOS",
        name: "Mutation guard policy",
        rules: rules.map((rule) => ({
          id: rule.id,
          title: rule.id,
          informational: false,
          mappings: rule.mapped === false
            ? []
            : [{ kind: "relution-native", type: "IOS_RESTRICTION", values: rule.values }],
        })),
      },
    ],
  };
}

function createBundle(): RelutionTemplateBundle {
  return createTestTemplateBundle({
    serverVersion: "test",
    sourceImage: "test",
    sourceImageDigest: "sha256:test",
    generatedAt: "2026-05-28T00:00:00.000Z",
    platforms: ["IOS"],
    configurationTypes: [
      {
        type: "IOS_RESTRICTION",
        label: "iOS Restrictions",
        schemaName: "IosRestriction",
        platforms: ["IOS"],
        enrollmentTypes: [],
        multiConfig: true,
        portalHidden: false,
        placeholders: [],
        required: [],
        fields: [],
      },
    ],
  });
}

function createAppleSchemaCatalog(): AppleSchemaCatalog {
  return {
    ...emptyAppleSchemaCatalog(),
    source: {
      repository: "test",
      revision: "test",
      generatedAt: "2026-05-28T00:00:00.000Z",
    },
  };
}

function sequentialUuid(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `uuid-${String(next)}`;
  };
}
