import assert from "node:assert/strict";
import test from "node:test";
import { buildComplianceReport, type ComplianceSourceCatalogs } from "../src/compliance.js";
import type { AppleSchemaCatalog } from "../src/apple-schema.js";
import type { RecommendationCatalogResponse, RecommendationRecord } from "../src/recommendation-types.js";
import type { RelutionTemplateBundle } from "../src/templates.js";
import type { PolicyWorkspace } from "../src/workspace.js";

test("multi-instance native mappings use same-identity candidates", () => {
  const result = firstResult(buildReport({
    targetType: "WINDOWS_CUSTOM_CSP",
    expectedValues: { name: "TargetCsp", enabled: true },
    configurations: [
      { type: "WINDOWS_CUSTOM_CSP", name: "TargetCsp", enabled: false },
      { type: "WINDOWS_CUSTOM_CSP", name: "OtherCsp", enabled: false },
    ],
  }));

  assert.equal(result.status, "exact-gap");
  assert.equal(result.mappingResults[0]?.status, "mismatch");
});

test("single-instance native mappings do not use same-identity filtering", () => {
  const result = firstResult(buildReport({
    targetType: "NATIVE_MULTI",
    expectedValues: { name: "TargetNative", enabled: true },
    configurations: [
      { type: "NATIVE_MULTI", name: "TargetNative", enabled: false },
      { type: "NATIVE_MULTI", name: "OtherNative", enabled: false },
    ],
  }));

  assert.equal(result.status, "choice-required");
  assert.equal(result.mappingResults[0]?.status, "ambiguous");
});

function buildReport(options: {
  targetType: string;
  expectedValues: Record<string, unknown>;
  configurations: Array<Record<string, unknown>>;
}): ReturnType<typeof buildComplianceReport> {
  return buildComplianceReport({
    workspace: createWorkspace(options.configurations),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["vendor"],
    catalogs: createArtifacts(options.targetType, options.expectedValues),
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });
}

function firstResult(report: ReturnType<typeof buildComplianceReport>): ReturnType<typeof buildComplianceReport>["results"][number] {
  const result = report.results[0];
  assert.ok(result);
  return result;
}

function createArtifacts(targetType: string, values: Record<string, unknown>): Partial<Record<"vendor", ComplianceSourceCatalogs>> {
  const recommendation: RecommendationRecord = {
    id: `${targetType.toLowerCase()}-identity`,
    title: `${targetType} identity`,
    platform: "WINDOWS",
    relutionMapping: {
      status: "exact",
      mergeableInImportableRuleset: true,
      candidates: [],
      rulesetMappings: [{ kind: "relution-native", type: targetType, values }],
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
    vendor: {
      recommendationCatalog: {
        source: "vendor",
        label: "Vendor",
        available: true,
        recommendationCount: 1,
        displayPlatforms: ["WINDOWS"],
        importPlatforms: ["WINDOWS"],
        displayToImportPlatform: { WINDOWS: "WINDOWS" },
        recommendations: [recommendation],
      } satisfies RecommendationCatalogResponse,
    },
  };
}

function createWorkspace(configurations: Array<Record<string, unknown>>): PolicyWorkspace {
  return {
    metadata: {},
    report: {},
    policies: [
      {
        path: "policies/policy_test.json",
        document: {
          name: "Windows policy",
          platform: "WINDOWS",
          versions: [{
            configurations: configurations.map((details, index) => ({
              uuid: `configuration-${String(index)}`,
              details: { uuid: `details-${String(index)}`, ...details },
            })),
          }],
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
    platforms: ["WINDOWS"],
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
