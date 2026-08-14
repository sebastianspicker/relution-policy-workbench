/** Covers post-extraction REXP validation and audit reports. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAppleCompatReport } from "../src/apple-compat.js";
import { createRelutionAuditReport, writeAuditOutputs } from "../src/audit.js";
import { inspectMobileConfigText } from "../src/plist.js";
import { extractRexp } from "../src/rexp.js";
import { loadEditorSidecar } from "../src/sidecar.js";
import { loadTemplateBundle } from "../src/templates.js";
import { loadWorkspace, type SchemaCompatibilityIssue, validateWorkspace } from "../src/workspace.js";
import { readZip, writeZip } from "../src/zip.js";
import { fixture, password, type RelutionTemplateAuditShape } from "./rexp-helpers.js";

const RELUTION_26_1_1_MIN_SPRING_PROPERTIES = 450;
test("marks arbitrary non-XML mobileconfig text as signed-invalid", () => {
  const inspection = inspectMobileConfigText("this is not xml");

  assert.equal(inspection.signatureState, "signed-invalid");
});

test("rejects ZIP entries that exceed the supported uncompressed size", () => {
  const oversized = Buffer.alloc(17 * 1024 * 1024, 0x41);
  const archive = writeZip([{ name: "too-large.json", data: oversized }]);

  assert.throws(() => readZip(archive), /exceeds the supported size/i);
});

test("rejects malformed mobileconfig restore entries when loading sidecar state", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-sidecar-malformed-"));
  writeFileSync(
    join(root, "editor-sidecar.json"),
    `${JSON.stringify({
      version: 1,
      mobileConfigRestore: [{ policyPath: "policies/policy_TEST.json", configuration: {}, configurationUuid: 42 }],
      ddmArtifacts: [],
      mdmCommandArtifacts: [],
      customManifests: [],
    }, null, 2)}\n`,
  );

  assert.throws(() => loadEditorSidecar(root), /Malformed editor-sidecar\.json: invalid mobileConfigRestore\[0\]/u);
});

test("validates the provided Relution export with local compatibility rules", () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-sample-validation-"));

  extractRexp(fixture, root, password, { force: true, pretty: true });
  const validation = validateWorkspace(loadWorkspace(root), bundle);

  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);
});

test("audits every template through local mock rexp roundtrip", () => {
  const bundle = loadTemplateBundle();
  const report = createRelutionAuditReport({ bundle, key: password, sampleRexp: fixture });

  assert.equal(report.summary.platformCount, bundle.platforms.length);
  assert.equal(report.summary.configurationTypeCount, bundle.configurationTypes.length);
  assert.equal(report.summary.schemaCount, Object.keys(bundle.schemas).length);
  assert.equal(report.summary.springPropertyCount >= RELUTION_26_1_1_MIN_SPRING_PROPERTIES, true);
  assert.equal(report.summary.mockRoundtripPassed, bundle.configurationTypes.length);
  assert.equal(report.summary.mockRoundtripFailed, 0);
  assert.equal(report.sampleExport?.validationOk, true);
  assert.equal(report.sampleExport?.verifyOk, true);
  assert.equal(hasSchemaCompatibilityIssue(report.schemaCompatibilityIssues, "Organization", "Organization.properties.email", "IsAlphabetic"), true);
  assert.equal(hasSchemaCompatibilityIssue(report.schemaCompatibilityIssues, "IotUpdateConfiguration", "IotUpdateConfiguration.allOf[1].properties.serverUrl", "https?"), true);
});

test("writes machine-readable and markdown audit reports", () => {
  const bundle = loadTemplateBundle();
  const report = createRelutionAuditReport({ bundle, key: password, sampleRexp: fixture });
  const root = mkdtempSync(join(tmpdir(), "relution-audit-output-"));
  const jsonOut = join(root, "audit-report.json");
  const markdownOut = join(root, "AUDIT.md");

  writeAuditOutputs(report, { jsonOut, markdownOut });

  assert.equal(existsSync(jsonOut), true);
  assert.equal(existsSync(markdownOut), true);
  const parsed = JSON.parse(readFileSync(jsonOut, "utf8")) as RelutionTemplateAuditShape;
  assert.equal(parsed.configurationTypes.length, bundle.configurationTypes.length);
  assert.equal(parsed.configurationTypes.some((entry) => entry.fields.length > 0), true);
  assert.equal(readFileSync(markdownOut, "utf8").includes(`Mock roundtrip: ${bundle.configurationTypes.length} passed, 0 failed`), true);
});

test("reports Jamf Apple gaps that can be wired through Relution mobileconfig", () => {
  const bundle = loadTemplateBundle();
  const report = createAppleCompatReport(bundle);
  const expectedMobileconfigIds = [
    "acme-certificate",
    "associated-domains",
    "autonomous-single-app-mode",
    "cellular-private-network",
    "certificate-preference",
    "certificate-revocation",
    "certificate-transparency",
    "exchange-web-services",
    "identity-preference",
    "lights-out-management",
    "lock-screen-message",
    "managed-login-items",
    "managed-preferences",
    "network-relay",
    "network-usage-rules",
    "pppc",
    "printing",
    "smart-card",
    "system-migration",
    "tv-remote",
    "xsan",
    "xsan-preferences",
  ];
  const mobileconfigIds = report.settings
    .filter((setting) => setting.status === "mobileconfig-backed")
    .map((setting) => setting.id)
    .sort();
  const mobileconfigBackedSettings = report.settings.filter((setting) => setting.status === "mobileconfig-backed");
  const notWireableSettings = report.settings.filter((setting) => setting.status === "not-mobileconfig-wireable");

  assert.equal(report.summary.relutionHasMobileconfigTransport, true);
  assert.equal(report.summary.totalJamfGapSettings, report.settings.length);
  assert.equal(report.summary.mobileconfigBacked, mobileconfigBackedSettings.length);
  assert.equal(report.summary.notMobileconfigWireable, notWireableSettings.length);
  assert.equal("relutionServerPolicyExportIncludesMobileconfig" in report.summary, false);
  assert.equal(report.summary.relutionMobileconfigPlatforms.includes("IOS"), true);
  assert.equal(report.summary.relutionMobileconfigPlatforms.includes("MACOS"), true);
  assert.equal(mobileconfigBackedSettings.every((setting) => setting.relutionTransportType === "APPLE_MOBILECONFIG"), true);
  assert.equal(expectedMobileconfigIds.every((id) => mobileconfigIds.includes(id)), true);
  assert.equal(report.settings.some((setting) => setting.id === "pppc" && setting.payloadType === "com.apple.TCC.configuration-profile-policy"), true);
  assert.equal(report.settings.some((setting) => setting.id === "declarative-management-declarations" && setting.status === "not-mobileconfig-wireable"), true);
});

function hasSchemaCompatibilityIssue(
  issues: readonly SchemaCompatibilityIssue[],
  schemaName: string,
  path: string,
  patternFragment: string,
): boolean {
  return issues.some((issue) =>
    issue.kind === "invalid-pattern" &&
    issue.schemaName === schemaName &&
    issue.path === path &&
    issue.pattern.includes(patternFragment)
  );
}
