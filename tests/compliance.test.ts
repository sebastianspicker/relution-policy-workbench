/** Covers end-to-end recommendation evaluation and compliance report semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyComplianceRemediationToWorkspace,
  buildComplianceReport,
} from "../src/compliance.js";

test("buildComplianceReport: exact native mapping yields one compliant result and one remediable gap", () => {
  const artifacts = createBsiNativeMultiArtifacts([
    createNativeRecommendation({
      id: "bsi-native-compliant",
      title: "Compliant native recommendation",
      targetType: "NATIVE_SINGLE",
      values: { enforced: true },
    }),
    bsiNativeMultiGapRecommendation(),
  ]);

  const workspace = createWorkspace("IOS", [
    createConfiguration("NATIVE_SINGLE", {
      enforced: true,
    }),
  ]);

  const report = buildComplianceReport({
    workspace,
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["bsi"],
    catalogs: artifacts,
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });

  assert.equal(report.summary.totalRecommendations, 2);
  assert.equal(report.summary.byStatus.compliant, 1);
  assert.equal(report.summary.byStatus["exact-gap"], 1);

  const compliant = resultById(report, "bsi", "bsi-native-compliant");
  assert.equal(compliant.status, "compliant");
  assert.equal(compliant.mappingResults[0]?.status, "compliant");
  assert.deepEqual(compliant.matchedConfigurations.map((entry) => entry.configurationIndex), [0]);

  const gap = resultById(report, "bsi", "bsi-native-gap");
  assert.equal(gap.status, "exact-gap");
  assert.equal(gap.mappingResults[0]?.status, "missing");
  assert.deepEqual(gap.remediationOptions.map((option) => option.id), ["native-bundle:bsi-native-multi"]);
});

for (const scenario of [
  {
    name: "buildComplianceReport: stricter numeric value satisfies at-least constraint",
    constraint: 14,
    expected: { status: "compliant", mappingStatus: "compliant" },
  },
  {
    name: "buildComplianceReport: infinite numeric constraint value reports an exact gap",
    constraint: "1e999",
    expected: { status: "exact-gap", mappingStatus: "mismatch" },
  },
] as const) {
  test(scenario.name, () => {
  const artifacts = createArtifacts({
    source: "cis",
    recommendations: [
      createNativeRecommendation({
        id: "cis-password-length",
        title: "Minimum password length",
        targetType: "NATIVE_SINGLE",
        values: { minLength: 14 },
        constraints: [{ path: "minLength", operator: "atLeast", value: scenario.constraint }],
      }),
    ],
  });

  const report = buildComplianceReport({
    workspace: createWorkspace("IOS", [
      createConfiguration("NATIVE_SINGLE", {
        minLength: 16,
      }),
    ]),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["cis"],
    catalogs: artifacts,
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });

  const result = resultById(report, "cis", "cis-password-length");
    assert.equal(result.status, scenario.expected.status);
    assert.equal(result.mappingResults[0]?.status, scenario.expected.mappingStatus);
  });
}

test("applyComplianceRemediationToWorkspace: Windows Custom CSP bundle adds the missing matching setting", () => {
  const customCspValues = {
    enabled: true,
    name: "PreventEnablingLockScreenCamera",
    installSyncML: "<Replace><Item><Target><LocURI>./Device/Vendor/MSFT/Policy/Config/DeviceLock/PreventEnablingLockScreenCamera</LocURI></Target><Data><![CDATA[<enabled/>]]></Data></Item></Replace>",
    deleteSyncML: "<Delete><Item><Target><LocURI>./Device/Vendor/MSFT/Policy/Config/DeviceLock/PreventEnablingLockScreenCamera</LocURI></Target></Item></Delete>",
    wrapInAtomic: true,
  };
  const artifacts = createArtifacts({
    source: "vendor",
    recommendations: [
      createNativeRecommendation({
        id: "vendor-custom-csp",
        title: "Prevent enabling lock screen camera",
        targetType: "WINDOWS_CUSTOM_CSP",
        values: customCspValues,
        platform: "WINDOWS",
      }),
    ],
    bundles: [
      createSettingBundle({
        source: "vendor",
        bundleId: "vendor-custom-csp",
        targetType: "WINDOWS_CUSTOM_CSP",
        recommendationIds: ["vendor-custom-csp"],
        details: { type: "WINDOWS_CUSTOM_CSP", ...customCspValues },
        policyPlatform: "WINDOWS",
      }),
    ],
  });
  const workspace = createWorkspace("WINDOWS", [
    createConfiguration("WINDOWS_CUSTOM_CSP", {
      enabled: true,
      name: "DifferentCspSetting",
      installSyncML: "<Replace/>",
      deleteSyncML: "<Delete/>",
      wrapInAtomic: true,
    }),
  ]);

  const report = buildComplianceReport({
    workspace,
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["vendor"],
    catalogs: artifacts,
    bundle: createBundle(["WINDOWS"]),
    appleSchema: createAppleSchemaCatalog(),
  });
  const result = resultById(report, "vendor", "vendor-custom-csp");
  assert.equal(result.status, "exact-gap");
  assert.equal(result.mappingResults[0]?.status, "missing");

  const remediated = applyComplianceRemediationToWorkspace({
    workspace,
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["vendor"],
    catalogs: artifacts,
    bundle: createBundle(["WINDOWS"]),
    appleSchema: createAppleSchemaCatalog(),
    source: "vendor",
    recommendationId: "vendor-custom-csp",
    remediationId: "native-bundle:vendor-custom-csp",
  });
  const configurations = selectedConfigurations(remediated.workspace);
  assert.equal(configurations.length, 2);
  assert.equal(configurations.some((configuration) => configuration.details?.name === "PreventEnablingLockScreenCamera"), true);
  assert.equal(resultById(remediated.report, "vendor", "vendor-custom-csp").status, "compliant");
});

test("buildComplianceReport: variant-backed native mapping requires an explicit remediation choice", () => {
  const artifacts = createArtifacts({
    source: "vendor",
    recommendations: [
      createNativeRecommendation({
        id: "vendor-system-update",
        title: "Choose a system update strategy",
        platform: "ANDROID",
        targetType: "NATIVE_MULTI",
        values: { systemUpdateType: "WINDOWED" },
      }),
    ],
    bundles: [
      createSettingBundle({
        source: "vendor",
        bundleId: "vendor-system-update-automatic",
        policyPlatform: "ANDROID_ENTERPRISE",
        sourcePlatform: "ANDROID",
        targetType: "NATIVE_MULTI",
        variantId: "automatic",
        recommendationIds: ["vendor-system-update"],
        details: {
          type: "NATIVE_MULTI",
          systemUpdateType: "AUTOMATIC",
        },
      }),
      createSettingBundle({
        source: "vendor",
        bundleId: "vendor-system-update-windowed",
        policyPlatform: "ANDROID_ENTERPRISE",
        sourcePlatform: "ANDROID",
        targetType: "NATIVE_MULTI",
        variantId: "windowed",
        recommendationIds: ["vendor-system-update"],
        details: {
          type: "NATIVE_MULTI",
          systemUpdateType: "WINDOWED",
        },
      }),
    ],
    variantGroups: [
      {
        groupId: "vendor-system-update-variants",
        policyPlatform: "ANDROID_ENTERPRISE",
        targetType: "NATIVE_MULTI",
        conflictingPaths: ["systemUpdateType"],
        variants: [
          {
            bundleId: "vendor-system-update-automatic",
            variantId: "automatic",
            importFilePath: "example/vendor-references/relution-settings/ANDROID_ENTERPRISE/NATIVE_MULTI--automatic.json",
          },
          {
            bundleId: "vendor-system-update-windowed",
            variantId: "windowed",
            importFilePath: "example/vendor-references/relution-settings/ANDROID_ENTERPRISE/NATIVE_MULTI--windowed.json",
          },
        ],
      },
    ],
  });

  const report = buildComplianceReport({
    workspace: createWorkspace("ANDROID_ENTERPRISE"),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["vendor"],
    catalogs: artifacts,
    bundle: createBundle(["IOS", "ANDROID_ENTERPRISE"]),
    appleSchema: createAppleSchemaCatalog(),
  });

  const result = resultById(report, "vendor", "vendor-system-update");
  assert.equal(result.status, "choice-required");
  assert.deepEqual(result.remediationOptions.map((option) => option.id).sort(), [
    "native-bundle:vendor-system-update-automatic",
    "native-bundle:vendor-system-update-windowed",
  ]);
});

test("applyComplianceRemediationToWorkspace: native bundle creates the missing configuration and closes the gap", () => {
  const artifacts = createBsiNativeMultiArtifacts([bsiNativeMultiGapRecommendation()]);

  const applied = applyComplianceRemediationToWorkspace({
    workspace: createWorkspace("IOS"),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["bsi"],
    source: "bsi",
    recommendationId: "bsi-native-gap",
    remediationId: "native-bundle:bsi-native-multi",
    catalogs: artifacts,
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog(),
  });

  const configurations = selectedConfigurations(applied.workspace);
  assert.equal(configurations.length, 1);
  assert.equal(configurations[0]?.details?.type, "NATIVE_MULTI");
  assert.equal(configurations[0]?.details?.enforced, true);

  const result = resultById(applied.report, "bsi", "bsi-native-gap");
  assert.equal(result.status, "compliant");
});

test("applyComplianceRemediationToWorkspace: Apple schema exact mapping creates the missing profile and closes the gap", () => {
  const appleEntry = createAppleApplicationAccessEntry();
  const artifacts = createArtifacts({
    source: "cis",
    recommendations: [
      createAppleSchemaRecommendation({
        id: "cis-ios-safari",
        title: "Require Safari fraud warnings",
        schemaId: appleEntry.id,
        values: { safariForceFraudWarning: true },
      }),
    ],
  });

  const applied = applyComplianceRemediationToWorkspace({
    workspace: createWorkspace("IOS"),
    selection: { policyIndex: 0, versionIndex: 0 },
    sources: ["cis"],
    source: "cis",
    recommendationId: "cis-ios-safari",
    remediationId: "recommendation:cis:cis-ios-safari",
    catalogs: artifacts,
    bundle: createBundle(),
    appleSchema: createAppleSchemaCatalog([appleEntry]),
  });

  const configurations = selectedConfigurations(applied.workspace);
  assert.equal(configurations.length, 1);
  assert.equal(configurations[0]?.details?.type, "APPLE_MOBILECONFIG");
  assert.equal(configurations[0]?.details?.secondLevelPayloadType, "com.apple.applicationaccess");

  const result = resultById(applied.report, "cis", "cis-ios-safari");
  assert.equal(result.status, "compliant");
});

import {
  bsiNativeMultiGapRecommendation,
  createAppleApplicationAccessEntry,
  createAppleSchemaCatalog,
  createAppleSchemaRecommendation,
  createArtifacts,
  createBsiNativeMultiArtifacts,
  createBundle,
  createConfiguration,
  createNativeRecommendation,
  createSettingBundle,
  createWorkspace,
  resultById,
  selectedConfigurations,
} from "./compliance-test-fixtures.js";
