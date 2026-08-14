/** Provides reusable workspace, catalog, and recommendation fixtures for compliance tests. */
import assert from "node:assert/strict";
import { buildComplianceReport, type ComplianceSourceCatalogs } from "../src/compliance.js";
import type { AppleSchemaCatalog, AppleSchemaEntry } from "../src/apple-schema.js";
import type { RecommendationCatalogResponse, RecommendationRecord, RecommendationSettingBundleCatalog, RecommendationSource } from "../src/recommendation-types.js";
import type { ConfigurationTemplate, RelutionTemplateBundle } from "../src/templates.js";
import type { PolicyWorkspace } from "../src/workspace.js";

export function createArtifacts(options: {
  source: RecommendationSource;
  recommendations: RecommendationRecord[];
  bundles?: RecommendationSettingBundleCatalog["bundles"];
  variantGroups?: RecommendationSettingBundleCatalog["variantGroups"];
}): Partial<Record<RecommendationSource, ComplianceSourceCatalogs>> {
  return {
    [options.source]: {
      recommendationCatalog: createRecommendationCatalog(options.source, options.recommendations),
      settingBundleCatalog: createSettingsCatalog(options.source, options.bundles ?? [], options.variantGroups ?? []),
    },
  };
}

export function createBsiNativeMultiArtifacts(recommendations: RecommendationRecord[]): Partial<Record<RecommendationSource, ComplianceSourceCatalogs>> {
  return createArtifacts({
    source: "bsi",
    recommendations,
    bundles: [
      createSettingBundle({
        source: "bsi",
        bundleId: "bsi-native-multi",
        targetType: "NATIVE_MULTI",
        recommendationIds: ["bsi-native-gap"],
        details: {
          type: "NATIVE_MULTI",
          enforced: true,
        },
      }),
    ],
  });
}

export function bsiNativeMultiGapRecommendation(): RecommendationRecord {
  return createNativeRecommendation({
    id: "bsi-native-gap",
    title: "Gap native recommendation",
    targetType: "NATIVE_MULTI",
    values: { enforced: true },
  });
}

function createRecommendationCatalog(source: RecommendationSource, recommendations: RecommendationRecord[]): RecommendationCatalogResponse {
  return {
    source,
    label: source.toUpperCase(),
    available: true,
    verifiedAsOf: "2026-04-24",
    recommendationCount: recommendations.length,
    displayPlatforms: [...new Set(recommendations.map((entry) => entry.platform))],
    importPlatforms: [...new Set(recommendations.map((entry) => entry.platform === "ANDROID" ? "ANDROID_ENTERPRISE" : entry.platform))],
    displayToImportPlatform: Object.fromEntries(
      [...new Set(recommendations.map((entry) => entry.platform))].map((platform) => [platform, source === "vendor" && platform === "ANDROID" ? "ANDROID_ENTERPRISE" : platform]),
    ),
    recommendations,
    ruleset: {
      version: 1,
      name: `${source} ruleset`,
      policies: [],
    },
  };
}

function createSettingsCatalog(
  source: RecommendationSource,
  bundles: RecommendationSettingBundleCatalog["bundles"],
  variantGroups: RecommendationSettingBundleCatalog["variantGroups"],
): RecommendationSettingBundleCatalog {
  return {
    version: 1,
    name: `${source} bundles`,
    verifiedAsOf: "2026-04-24",
    sourceRecommendationCatalogPath: `example/${source}-references/${source}-recommendations.json`,
    importableRulesetPath: `example/${source}-references/${source}-relution-ruleset.json`,
    bundles,
    variantGroups,
    nonImportableRecommendations: [],
  };
}

export function createSettingBundle(options: {
  source: RecommendationSource;
  bundleId: string;
  targetType: string;
  recommendationIds: string[];
  details: Record<string, unknown>;
  policyPlatform?: string;
  sourcePlatform?: string;
  variantId?: string;
}): RecommendationSettingBundleCatalog["bundles"][number] {
  const policyPlatform = options.policyPlatform ?? "IOS";
  return {
    bundleId: options.bundleId,
    source: options.source,
    sourcePlatform: options.sourcePlatform ?? policyPlatform,
    policyPlatform,
    targetType: options.targetType,
    importFilePath: `example/${options.source}-references/relution-settings/${policyPlatform}/${options.targetType}.json`,
    details: options.details,
    derivedFromRecommendationIds: options.recommendationIds,
    sourceIds: [options.bundleId],
    mergeStrategy: "deep-merge",
    ...(options.variantId === undefined ? {} : { variantId: options.variantId }),
  };
}

export function createNativeRecommendation(options: {
  id: string;
  title: string;
  targetType: string;
  values: Record<string, unknown>;
  platform?: string;
  constraints?: Array<{ path: string; operator: "atLeast" | "atMost" | "containsAll"; value: unknown }>;
}): RecommendationRecord {
  const platform = options.platform ?? "IOS";
  return {
    id: options.id,
    platform,
    osFamily: platform,
    policyName: `${platform} baseline`,
    moduleId: "SYS.1",
    moduleTitle: "Baseline",
    moduleRole: "baseline",
    sourceIds: [options.id],
    supportingSourceIds: [],
    category: "Basis-Anforderungen",
    requirementId: options.id.toUpperCase(),
    title: options.title,
    status: "active",
    protectionLevel: "B",
    actors: [],
    paragraphs: [options.title],
    requirementText: options.title,
    reason: options.title,
    descriptionContext: [],
    checklistThreatIds: [],
    checklistThreatTitles: [],
    moduleThreatContext: [],
    errata: [],
    relutionMapping: {
      status: "exact",
      mergeableInImportableRuleset: true,
      candidates: [{ kind: "relution-native", target: options.targetType, fieldPaths: Object.keys(options.values) }],
      rulesetMappings: [
        {
          kind: "relution-native",
          type: options.targetType,
          values: options.values,
          ...(options.constraints === undefined ? {} : { constraints: options.constraints }),
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
    fallbackTranslations: [],
  };
}

export function createAppleSchemaRecommendation(options: {
  id: string;
  title: string;
  schemaId: string;
  values: Record<string, unknown>;
}): RecommendationRecord {
  return {
    id: options.id,
    title: options.title,
    platform: "IOS",
    osFamily: "IOS",
    benchmarkId: "cis-ios",
    benchmarkTitle: "CIS iOS Benchmark",
    benchmarkVersion: "1.0.0",
    benchmarkDate: "2026-04-24",
    managementSurface: "APPLE_CONFIGURATION_PROFILE",
    sourcePdfPath: "example/cis-references/downloads/pdf/CIS_iOS.pdf",
    sourceIds: ["cis-ios"],
    recommendationId: "2.2.2",
    profileApplicability: ["Level 1"],
    description: options.title,
    rationale: options.title,
    impact: "",
    audit: "",
    remediation: "",
    defaultValue: false,
    references: [],
    recommendedValue: true,
    fallbackTranslations: [],
    relutionMapping: {
      status: "exact",
      mergeableInImportableRuleset: true,
      candidates: [{ kind: "apple-schema-profile", target: options.schemaId, fieldPaths: Object.keys(options.values) }],
      rulesetMappings: [{ kind: "apple-schema-profile", schemaId: options.schemaId, values: options.values }],
      notes: [],
    },
    implementation: {
      category: "relution-achievable",
      surfaces: ["apple-schema-profile"],
      importableVia: ["ruleset-import"],
      blockingReasons: [],
    },
    familySourceId: "cis-ios-family",
    additionalInformation: "",
    assessmentStatus: "Automated",
  };
}

export function createWorkspace(platform: string, configurations: Array<Record<string, unknown>> = []): PolicyWorkspace {
  return {
    metadata: {},
    report: {},
    policies: [
      {
        path: "policies/policy_test.json",
        document: {
          uuid: "POLICY-1",
          name: `${platform} policy`,
          platform,
          versions: [
            {
              uuid: "VERSION-1",
              configurations,
            },
          ],
        },
      },
    ],
  };
}

export function createConfiguration(type: string, details: Record<string, unknown>): Record<string, unknown> {
  return {
    uuid: `CONF-${type}`,
    details: {
      uuid: `DETAIL-${type}`,
      type,
      ...details,
    },
  };
}

export function createBundle(platforms: string[] = ["IOS"]): RelutionTemplateBundle {
  const templates: ConfigurationTemplate[] = [
    {
      type: "NATIVE_SINGLE",
      label: "Native Single",
      schemaName: "NativeSingle",
      platforms,
      enrollmentTypes: [],
      multiConfig: false,
      portalHidden: false,
      placeholders: [],
      required: [],
      fields: [],
    },
    {
      type: "NATIVE_MULTI",
      label: "Native Multi",
      schemaName: "NativeMulti",
      platforms,
      enrollmentTypes: [],
      multiConfig: true,
      portalHidden: false,
      placeholders: [],
      required: [],
      fields: [],
    },
    {
      type: "WINDOWS_CUSTOM_CSP",
      label: "Windows Custom CSP",
      schemaName: "WindowsCustomCsp",
      platforms: ["WINDOWS"],
      enrollmentTypes: [],
      multiConfig: true,
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
    platforms,
    enrollmentTypes: [],
    configurationTypes: templates,
    schemas: {},
    iosSystemApps: {},
    springConfigurationMetadata: {},
  };
}

export function createAppleSchemaCatalog(entries: AppleSchemaEntry[] = [createAppleApplicationAccessEntry()]): AppleSchemaCatalog {
  return {
    version: 1,
    source: {
      repository: "apple/device-management",
      revision: "test",
      generatedAt: "2026-04-24T00:00:00.000Z",
    },
    counts: {
      profile: entries.length,
      "ddm-configuration": 0,
      "ddm-asset": 0,
      "ddm-activation": 0,
      "ddm-management": 0,
      "ddm-status": 0,
      "mdm-command": 0,
      "mdm-checkin": 0,
      "ddm-protocol": 0,
    },
    entries,
  };
}

export function createAppleApplicationAccessEntry(): AppleSchemaEntry {
  return {
    id: "profile:com.apple.applicationaccess",
    kind: "profile",
    title: "Application Access",
    description: "Restrictions payload.",
    identifier: "com.apple.applicationaccess",
    sourcePath: "profiles/com.apple.applicationaccess.yaml",
    availability: {
      platforms: ["IOS"],
      allowMultiple: false,
      requiresMdm: false,
      deprecated: false,
      notes: [],
    },
    deprecated: false,
    fields: [
      {
        path: "safariForceFraudWarning",
        payloadKey: "safariForceFraudWarning",
        title: "Require Safari fraud warnings",
        kind: "boolean",
        required: false,
        description: "",
        defaultValue: false,
        enumValues: [],
        variableSafe: true,
      },
    ],
  };
}

export function resultById(
  report: ReturnType<typeof buildComplianceReport>,
  source: RecommendationSource,
  recommendationId: string,
): ReturnType<typeof buildComplianceReport>["results"][number] {
  const result = report.results.find((entry) => entry.source === source && entry.recommendationId === recommendationId);
  assert.ok(result);
  return result;
}

export function selectedConfigurations(
  workspace: PolicyWorkspace,
): Array<{ details?: { type?: string; enforced?: boolean; name?: string; secondLevelPayloadType?: string } }> {
  const policy = workspace.policies[0];
  const document = policy?.document as { versions?: Array<{ configurations?: Array<{ details?: { type?: string; enforced?: boolean; name?: string; secondLevelPayloadType?: string } }> }> } | undefined;
  const version = document?.versions?.[0];
  return Array.isArray(version?.configurations) ? version.configurations : [];
}
