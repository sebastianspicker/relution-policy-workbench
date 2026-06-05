import assert from "node:assert/strict";
import test from "node:test";
import { applyComplianceRemediationToWorkspace, buildComplianceReport, type ComplianceSourceCatalogs } from "../src/compliance.js";
import type { AppleSchemaCatalog } from "../src/apple-schema.js";
import type { RecommendationCatalogResponse, RecommendationRecord } from "../src/recommendation-types.js";
import type { RelutionTemplateBundle } from "../src/templates.js";
import type { PolicyWorkspace } from "../src/workspace.js";

test("buildComplianceReport exposes degraded source status when setting bundles are unavailable", () => {
  const report = buildComplianceReport({
    workspace: createWorkspace(),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["bsi"],
    catalogs: {
      bsi: {
        recommendationCatalog: createRecommendationCatalog(),
        settingBundleCatalogError: "missing settings catalog fixture",
      } satisfies ComplianceSourceCatalogs,
    },
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });

  assert.deepEqual(report.sourceStatuses, [
    {
      source: "bsi",
      recommendationCatalog: "loaded",
      settingBundleCatalog: "degraded",
      warnings: ["bsi setting-bundle catalog unavailable: missing settings catalog fixture"],
    },
  ]);
  assert.deepEqual(report.warnings, ["bsi setting-bundle catalog unavailable: missing settings catalog fixture"]);
  assert.equal(report.results[0]?.status, "exact-gap");
  assert.deepEqual(report.results[0]?.remediationOptions.map((option) => ({
    id: option.id,
    available: option.available,
    unavailableReason: option.unavailableReason,
  })), [
    {
      id: "recommendation:bsi:bsi-native-gap",
      available: false,
      unavailableReason: "Setting bundle catalog failed to load: missing settings catalog fixture",
    },
  ]);
  assert.match(report.results[0]?.blockingReasons.join("\n") ?? "", /Setting bundle catalog failed to load: missing settings catalog fixture/u);
});

test("applyComplianceRemediationToWorkspace rejects degraded native remediations before applying", () => {
  assert.throws(
    () => applyComplianceRemediationToWorkspace({
      workspace: createWorkspace(),
      selection: { policyIndex: 0, versionIndex: 0 },
      sources: ["bsi"],
      catalogs: {
        bsi: {
          recommendationCatalog: createRecommendationCatalog(),
          settingBundleCatalogError: "missing settings catalog fixture",
        } satisfies ComplianceSourceCatalogs,
      },
      bundle: createBundle(),
      appleSchema: createAppleSchemaCatalog(),
      source: "bsi",
      recommendationId: "bsi-native-gap",
      remediationId: "recommendation:bsi:bsi-native-gap",
    }),
    /Compliance remediation unavailable: Setting bundle catalog failed to load: missing settings catalog fixture/u,
  );
});

test("buildComplianceReport exposes loaded source status when all artifacts are available", () => {
  const report = buildComplianceReport({
    workspace: createWorkspace(),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["bsi"],
    catalogs: {
      bsi: {
        recommendationCatalog: createRecommendationCatalog(),
        settingBundleCatalog: {
          version: 1,
          name: "BSI bundles",
          verifiedAsOf: "2026-04-24",
          sourceRecommendationCatalogPath: "example/bsi-references/bsi-recommendations.json",
          importableRulesetPath: "example/bsi-references/bsi-relution-ruleset.json",
          bundles: [],
          variantGroups: [],
          nonImportableRecommendations: [],
        },
      } satisfies ComplianceSourceCatalogs,
    },
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });

  assert.deepEqual(report.sourceStatuses, [
    {
      source: "bsi",
      recommendationCatalog: "loaded",
      settingBundleCatalog: "loaded",
      warnings: [],
    },
  ]);
  assert.deepEqual(report.warnings, []);
});

function createRecommendationCatalog(): RecommendationCatalogResponse {
  const recommendation: RecommendationRecord = {
    id: "bsi-native-gap",
    title: "Gap native recommendation",
    platform: "IOS",
    relutionMapping: {
      status: "exact",
      mergeableInImportableRuleset: true,
      candidates: [],
      rulesetMappings: [{ kind: "relution-native", type: "NATIVE_MULTI", values: { enforced: true } }],
      notes: [],
    },
    implementation: {
      category: "relution-achievable",
      surfaces: ["relution-native"],
      importableVia: ["apply-json", "ruleset-import"],
      blockingReasons: [],
    },
  } as unknown as RecommendationRecord;
  return {
    source: "bsi",
    label: "BSI",
    available: true,
    recommendationCount: 1,
    displayPlatforms: ["IOS"],
    importPlatforms: ["IOS"],
    displayToImportPlatform: { IOS: "IOS" },
    recommendations: [recommendation],
    ruleset: { version: 1, name: "BSI", policies: [] },
  };
}

function createWorkspace(): PolicyWorkspace {
  return {
    metadata: {},
    report: {},
    policies: [
      {
        path: "policies/policy_test.json",
        document: {
          name: "IOS policy",
          platform: "IOS",
          versions: [{ configurations: [] }],
        },
      },
    ],
  };
}

function createBundle(): RelutionTemplateBundle {
  return {
    serverVersion: "26.1.1",
    sourceImage: "relution/server:26.1.1",
    sourceImageDigest: "sha256:test",
    generatedAt: "2026-04-24T00:00:00.000Z",
    refreshDiagnostics: {
      runtimeMetadata: {
        source: "reflected",
        reflectedCount: 0,
        configurationTypeCount: 0,
      },
      iosSystemAppsLoaded: false,
      springConfigurationMetadataLoaded: false,
    },
    platforms: ["IOS"],
    enrollmentTypes: [],
    configurationTypes: [],
    schemas: {},
    iosSystemApps: {},
    springConfigurationMetadata: {},
  };
}

function createAppleSchemaCatalog(): AppleSchemaCatalog {
  return {
    version: 1,
    source: {
      repository: "apple/device-management",
      revision: "test",
      generatedAt: "2026-04-24T00:00:00.000Z",
    },
    counts: {
      profile: 0,
      "ddm-configuration": 0,
      "ddm-asset": 0,
      "ddm-activation": 0,
      "ddm-management": 0,
      "ddm-status": 0,
      "mdm-command": 0,
      "mdm-checkin": 0,
      "ddm-protocol": 0,
    },
    entries: [],
  };
}
