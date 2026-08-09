/** Immutable recommendation and compliance fixtures for controller and panel tests. */
import type { ComplianceReport } from "../../../src/compliance.js";
import type { BsiRecommendationRecord, RecommendationCatalogResponse, RecommendationIndexResponse, RecommendationSourceSummary } from "../../../src/recommendation-types.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";

const BSI_RECOMMENDATION: BsiRecommendationRecord = {
  id: "bsi-ios-passcode", platform: "IOS", osFamily: "IOS", policyName: "iOS BSI Grundschutz", moduleId: "SYS.1", moduleTitle: "Mobile baseline", moduleRole: "baseline", sourceIds: ["source-1"], supportingSourceIds: [], category: "Basis-Anforderungen", requirementId: "SYS.1.A1", title: "Use a strong passcode", status: "active", protectionLevel: "B", actors: [], paragraphs: ["Use a strong passcode."], requirementText: "Use a strong passcode.", reason: "Because weak passcodes are weak.", descriptionContext: [], checklistThreatIds: [], checklistThreatTitles: [], moduleThreatContext: [], errata: [],
  relutionMapping: { status: "exact", mergeableInImportableRuleset: true, candidates: [], rulesetMappings: [], notes: [] },
  fallbackTranslations: [{ id: "fallback-audit", role: "audit", method: "terminal", title: "Terminal fallback", rawText: "Run a terminal profile check.", commands: ["profiles show -type configuration"] }],
};
const BSI_SOURCE: RecommendationSourceSummary = {
  source: "bsi", label: "BSI", available: true, verifiedAsOf: "2026-04-23", recommendationCount: 1, displayPlatforms: ["IOS", "MACOS"], importPlatforms: ["IOS", "MACOS"], displayToImportPlatform: { IOS: "IOS", MACOS: "MACOS" },
};
const RECOMMENDATION_INDEX: RecommendationIndexResponse = {
  sources: [
    BSI_SOURCE,
    { source: "vendor", label: "Vendor", available: true, verifiedAsOf: "2026-04-23", recommendationCount: 1, displayPlatforms: ["ANDROID"], importPlatforms: ["ANDROID_ENTERPRISE"], displayToImportPlatform: { ANDROID: "ANDROID_ENTERPRISE" } },
    { source: "cis", label: "CIS", available: true, verifiedAsOf: "2026-04-23", recommendationCount: 1, displayPlatforms: ["IOS"], importPlatforms: ["IOS"], displayToImportPlatform: { IOS: "IOS" } },
  ],
};
const RECOMMENDATION_CATALOG: RecommendationCatalogResponse = {
  ...BSI_SOURCE,
  recommendations: [{ ...BSI_RECOMMENDATION, relutionMapping: { status: "exact", mergeableInImportableRuleset: true, candidates: [{ kind: "relution-native", target: "NATIVE_SINGLE", fieldPaths: ["name"] }], rulesetMappings: [{ kind: "relution-native", type: "NATIVE_SINGLE", values: { name: "Recommendation applied", type: "NATIVE_SINGLE" } }], notes: [] } }],
  ruleset: { version: 1, name: "BSI Recommendations", verifiedAsOf: "2026-04-23", sourceIndexPath: "example/bsi-references/sources.json", recommendationCatalogPath: "example/bsi-references/bsi-recommendations.json", policies: [{ platform: "IOS", name: "iOS BSI Grundschutz", rules: [{ id: "bsi-ios-passcode", title: "Use a strong passcode", mappings: [{ kind: "relution-native", type: "NATIVE_SINGLE", values: { type: "NATIVE_SINGLE", name: "Recommendation applied" } }] }] }] },
};
const COMPLIANCE_REPORT = {
  policyPath: "policies/policy_test.json", policyName: "Test Policy", policyPlatform: "IOS", versionIndex: 0, sources: ["bsi", "vendor", "cis"],
  results: [{ id: "bsi:bsi-native-gap", source: "bsi", recommendationId: "bsi-native-gap", recommendation: RECOMMENDATION_CATALOG.recommendations[0]!, status: "exact-gap", mappingResults: [{ kind: "relution-native", target: "NATIVE_MULTI", expectedValues: { enforced: true }, status: "missing", matchingConfigurations: [], candidateConfigurations: [] }], matchedConfigurations: [], blockingReasons: ["Missing NATIVE_MULTI setting"], remediationOptions: [{ id: "native-bundle:bsi-native-bundle", kind: "native-bundle", label: "Apply NATIVE_MULTI exact bundle", coveredRecommendationIds: ["bsi-native-gap"], surfaces: ["relution-native"], bundleId: "bsi-native-bundle", targetType: "NATIVE_MULTI" }] }],
  summary: { totalRecommendations: 1, byStatus: { compliant: 0, "exact-gap": 1, "choice-required": 0, "parameter-required": 0, "not-checkable": 0 } },
} satisfies ComplianceReport;

const COMPLIANCE_PANEL_POLICY: WorkspacePolicy = {
  path: "policies/policy_test.json",
  document: {
    name: "Test Policy",
    platform: "IOS",
  },
};

const EXACT_GAP_COMPLIANCE_REPORT = {
  policyPath: "policies/policy_test.json",
  policyName: "Test Policy",
  policyPlatform: "IOS",
  versionIndex: 0,
  sources: ["bsi"],
  sourceStatuses: [{
    source: "bsi",
    recommendationCatalog: "loaded",
    settingBundleCatalog: "loaded",
    warnings: [],
  }],
  warnings: [],
  summary: {
    totalRecommendations: 1,
    byStatus: {
      compliant: 0,
      "exact-gap": 1,
      "choice-required": 0,
      "parameter-required": 0,
      "not-checkable": 0,
    },
  },
  results: [{
    id: "bsi:bsi-ios-passcode",
    source: "bsi",
    recommendationId: "bsi-ios-passcode",
    recommendation: BSI_RECOMMENDATION,
    status: "exact-gap",
    mappingResults: [{
      kind: "relution-native",
      target: "IOS_PASSCODE",
      expectedValues: { forcePIN: true },
      status: "missing",
      matchingConfigurations: [],
      candidateConfigurations: [],
    }],
    matchedConfigurations: [],
    blockingReasons: ["Missing IOS_PASSCODE setting"],
    remediationOptions: [{
      id: "native-bundle:bsi-ios-passcode",
      kind: "native-bundle",
      label: "Apply IOS_PASSCODE exact bundle",
      coveredRecommendationIds: ["bsi-ios-passcode"],
      surfaces: ["relution-native"],
      bundleId: "bsi-ios-passcode",
      targetType: "IOS_PASSCODE",
    }],
  }],
} satisfies ComplianceReport;

const DEGRADED_COMPLIANCE_REPORT = {
  policyPath: "policies/policy_test.json",
  policyName: "Test Policy",
  policyPlatform: "IOS",
  versionIndex: 0,
  sources: ["bsi"],
  sourceStatuses: [{
    source: "bsi",
    recommendationCatalog: "loaded",
    settingBundleCatalog: "degraded",
    warnings: ["bsi setting-bundle catalog unavailable: missing settings catalog fixture"],
  }],
  warnings: ["bsi setting-bundle catalog unavailable: missing settings catalog fixture"],
  summary: {
    totalRecommendations: 0,
    byStatus: {
      compliant: 0,
      "exact-gap": 0,
      "choice-required": 0,
      "parameter-required": 0,
      "not-checkable": 0,
    },
  },
  results: [],
} satisfies ComplianceReport;

const UNAVAILABLE_VENDOR_REMEDIATION_REPORT = {
  policyPath: "policies/policy_test.json",
  policyName: "Test Policy",
  policyPlatform: "IOS",
  versionIndex: 0,
  sources: ["vendor"],
  warnings: ["vendor setting-bundle catalog unavailable: missing settings catalog fixture"],
  summary: {
    totalRecommendations: 1,
    byStatus: {
      compliant: 0,
      "exact-gap": 1,
      "choice-required": 0,
      "parameter-required": 0,
      "not-checkable": 0,
    },
  },
  results: [{
    id: "vendor:vendor-native-gap",
    source: "vendor",
    recommendationId: "vendor-native-gap",
    recommendation: {
      id: "vendor-native-gap",
      platform: "IOS",
      title: "Disable unmanaged service",
      section: "Device restrictions",
      recommendedValue: true,
      reason: "The setting must be enforced.",
      sourceIds: [],
      vendor: {},
      relutionMapping: {
        status: "exact",
        mergeableInImportableRuleset: true,
        candidates: [],
        rulesetMappings: [],
        notes: [],
      },
    },
    status: "exact-gap",
    mappingResults: [{
      kind: "relution-native",
      target: "IOS_PASSCODE",
      expectedValues: { forcePIN: true },
      status: "missing",
      matchingConfigurations: [],
      candidateConfigurations: [],
    }],
    matchedConfigurations: [],
    blockingReasons: ["Setting bundle catalog failed to load: missing settings catalog fixture"],
    remediationOptions: [{
      id: "recommendation:vendor:vendor-native-gap",
      kind: "exact-recommendation",
      label: "Apply exact mapping for Disable unmanaged service",
      coveredRecommendationIds: ["vendor-native-gap"],
      surfaces: ["relution-native"],
      targetType: "IOS_PASSCODE",
      available: false,
      unavailableReason: "Setting bundle catalog failed to load: missing settings catalog fixture",
    }],
  }],
} satisfies ComplianceReport;

function copy<T>(value: T): T { return structuredClone(value); }

export function createRecommendationIndex(): RecommendationIndexResponse { return copy(RECOMMENDATION_INDEX); }
export function createBsiPasscodeRecommendation(): BsiRecommendationRecord { return copy(BSI_RECOMMENDATION); }
export function createRecommendationCatalog(overrides: Partial<RecommendationCatalogResponse> = {}): RecommendationCatalogResponse { return { ...copy(RECOMMENDATION_CATALOG), ...overrides }; }
export function createComplianceReport(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> { return { ...copy(COMPLIANCE_REPORT), ...overrides }; }
export function createCompliancePanelPolicy(): WorkspacePolicy { return copy(COMPLIANCE_PANEL_POLICY); }
export function createExactGapComplianceReport(): ComplianceReport { return copy(EXACT_GAP_COMPLIANCE_REPORT); }
export function createDegradedComplianceReport(): ComplianceReport { return copy(DEGRADED_COMPLIANCE_REPORT); }
export function createUnavailableVendorRemediationReport(): ComplianceReport { return copy(UNAVAILABLE_VENDOR_REMEDIATION_REPORT); }
