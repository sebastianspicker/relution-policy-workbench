import assert from "node:assert/strict";
import test from "node:test";
import { applyComplianceRemediationToWorkspace, buildComplianceReport, type ComplianceSourceCatalogs } from "../src/compliance.js";
import type { AppleSchemaCatalog } from "../src/apple-schema.js";
import type { RecommendationCatalogResponse, RecommendationRecord, RecommendationSettingBundleCatalog } from "../src/recommendation-types.js";
import type { ConfigurationTemplate, RelutionTemplateBundle } from "../src/templates.js";
import type { PolicyWorkspace } from "../src/workspace.js";

test("applyComplianceRemediationToWorkspace: rebuilt report for applied workspace keeps the closed gap count", () => {
  const workspace = createWorkspace();
  const catalogs = createArtifacts();
  const bundle = createBundle();
  const appleSchema = createAppleSchemaCatalog();
  const selection = { policyIndex: 0, versionIndex: 0 };
  const sources = ["bsi" as const];

  const firstReport = buildComplianceReport({
    workspace,
    selection,
    sources,
    catalogs,
    bundle,
    appleSchema,
  });

  assert.equal(firstReport.summary.byStatus["exact-gap"], 1);
  assert.equal(firstReport.summary.byStatus.compliant, 0);

  const applied = applyComplianceRemediationToWorkspace({
    workspace,
    selection,
    sources,
    catalogs,
    bundle,
    appleSchema,
    source: "bsi",
    recommendationId: "bsi-native-single",
    remediationId: "native-bundle:bsi-native-single",
  });

  const rebuiltReport = buildComplianceReport({
    workspace: applied.workspace,
    selection,
    sources,
    catalogs,
    bundle,
    appleSchema,
  });

  assert.equal(applied.report.summary.byStatus["exact-gap"], 0);
  assert.equal(rebuiltReport.summary.byStatus["exact-gap"], applied.report.summary.byStatus["exact-gap"]);
  assert.equal(rebuiltReport.summary.byStatus.compliant, applied.report.summary.byStatus.compliant);
  assert.equal(firstReport.summary.byStatus["exact-gap"] - rebuiltReport.summary.byStatus["exact-gap"], 1);
});

function createArtifacts(): Partial<Record<"bsi", ComplianceSourceCatalogs>> {
  const recommendation = createNativeRecommendation();
  return {
    bsi: {
      recommendationCatalog: {
        source: "bsi",
        label: "BSI",
        available: true,
        recommendationCount: 1,
        displayPlatforms: ["IOS"],
        importPlatforms: ["IOS"],
        displayToImportPlatform: { IOS: "IOS" },
        recommendations: [recommendation],
      } satisfies RecommendationCatalogResponse,
      settingBundleCatalog: {
        version: 1,
        name: "BSI bundles",
        sourceRecommendationCatalogPath: "example/bsi-references/bsi-recommendations.json",
        importableRulesetPath: "example/bsi-references/bsi-relution-ruleset.json",
        bundles: [
          {
            bundleId: "bsi-native-single",
            source: "bsi",
            sourcePlatform: "IOS",
            policyPlatform: "IOS",
            targetType: "NATIVE_SINGLE",
            importFilePath: "example/bsi-references/relution-settings/IOS/NATIVE_SINGLE.json",
            details: { type: "NATIVE_SINGLE", enforced: true },
            derivedFromRecommendationIds: [recommendation.id],
            sourceIds: ["bsi-native-single"],
            mergeStrategy: "deep-merge",
          },
        ],
        variantGroups: [],
        nonImportableRecommendations: [],
      } satisfies RecommendationSettingBundleCatalog,
    },
  };
}

function createNativeRecommendation(): RecommendationRecord {
  return {
    id: "bsi-native-single",
    title: "Require native single setting",
    platform: "IOS",
    relutionMapping: {
      status: "exact",
      mergeableInImportableRuleset: true,
      candidates: [],
      rulesetMappings: [
        {
          kind: "relution-native",
          type: "NATIVE_SINGLE",
          values: { enforced: true },
        },
      ],
      notes: [],
    },
    implementation: {
      category: "relution-achievable",
      surfaces: ["relution-native"],
      importableVia: ["apply-json", "ruleset-import"],
      blockingReasons: [],
    },
  } as unknown as RecommendationRecord;
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
  const templates: ConfigurationTemplate[] = [
    {
      type: "NATIVE_SINGLE",
      label: "Native Single",
      schemaName: "NativeSingle",
      platforms: ["IOS"],
      enrollmentTypes: [],
      multiConfig: false,
      portalHidden: false,
      placeholders: [],
      required: [],
      fields: [],
    },
  ];
  return {
    serverVersion: "26.1.1",
    sourceImage: "relution/server:26.1.1",
    sourceImageDigest: "sha256:test",
    generatedAt: "2026-04-24T00:00:00.000Z",
    refreshDiagnostics: {
      runtimeMetadata: {
        source: "reflected",
        reflectedCount: templates.length,
        configurationTypeCount: templates.length,
      },
      iosSystemAppsLoaded: false,
      springConfigurationMetadataLoaded: false,
    },
    platforms: ["IOS"],
    enrollmentTypes: [],
    configurationTypes: templates,
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
