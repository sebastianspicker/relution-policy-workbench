import assert from "node:assert/strict";
import test from "node:test";
import { buildComplianceReport, type ComplianceSourceCatalogs } from "../src/compliance.js";
import type { AppleSchemaCatalog } from "../src/apple-schema.js";
import type { RecommendationCatalogResponse, RecommendationRecord } from "../src/recommendation-types.js";
import type { RelutionTemplateBundle } from "../src/templates.js";
import type { PolicyWorkspace } from "../src/workspace.js";

test("buildComplianceReport reports every applicable recommendation as a gap when the version has no configurations", () => {
  const report = buildEmptyConfigurationReport();

  assert.equal(report.summary.totalRecommendations, 2);
  assert.equal(report.summary.byStatus["exact-gap"], 2);
  assert.deepEqual(report.results.map((entry) => entry.status), ["exact-gap", "exact-gap"]);
  assert.equal(report.results.every((entry) => entry.mappingResults[0]?.status === "missing"), true);
});

test("buildComplianceReport reports no compliant results when the version has no configurations", () => {
  const report = buildEmptyConfigurationReport();

  assert.equal(report.summary.byStatus.compliant, 0);
  assert.deepEqual(report.results.filter((entry) => entry.status === "compliant"), []);
});

function buildEmptyConfigurationReport(): ReturnType<typeof buildComplianceReport> {
  return buildComplianceReport({
    workspace: createWorkspace(),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["bsi"],
    catalogs: createArtifacts(),
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });
}

function createArtifacts(): Partial<Record<"bsi", ComplianceSourceCatalogs>> {
  const recommendations = [
    createNativeRecommendation("bsi-native-single", "NATIVE_SINGLE"),
    createNativeRecommendation("bsi-native-multi", "NATIVE_MULTI"),
  ];
  return {
    bsi: {
      recommendationCatalog: {
        source: "bsi",
        label: "BSI",
        available: true,
        recommendationCount: recommendations.length,
        displayPlatforms: ["IOS"],
        importPlatforms: ["IOS"],
        displayToImportPlatform: { IOS: "IOS" },
        recommendations,
      } satisfies RecommendationCatalogResponse,
    },
  };
}

function createNativeRecommendation(id: string, targetType: string): RecommendationRecord {
  return {
    id,
    title: `${targetType} recommendation`,
    platform: "IOS",
    relutionMapping: {
      status: "exact",
      mergeableInImportableRuleset: true,
      candidates: [],
      rulesetMappings: [{ kind: "relution-native", type: targetType, values: { enforced: true } }],
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
