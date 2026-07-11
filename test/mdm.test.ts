import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { diffMdm, generateMdm } from "../src/mdm-generator.js";
import { generatedPolicyName, loadMdmPolicySources, validateMdm, verifyMdmSources } from "../src/mdm-validation.js";
import type { MdmPolicySource } from "../src/mdm-types.js";

const policy: MdmPolicySource = {
  schema_version: 1,
  policy_id: "TEST-IOS-LAB-v1",
  platform: "IOS",
  model: "corporate_phone",
  ownership: "corporate",
  enrollment_model: "IOS",
  layer: 1,
  purpose: "baseline",
  status: "active",
  evidence_status: "REFERENCE_VALIDATED",
  minimum_os: "18",
  controls: ["MDM-AUTH-001"],
  dependencies: [],
  environment_placeholders: [],
  settings: [{ configuration_type: "IOS_PASSCODE", values: { minLength: 8 }, control_ids: ["MDM-AUTH-001"] }],
  rings: ["LAB"],
  production_ready: false,
};

test("generated policy names follow the Phase B naming contract", () => {
  assert.equal(generatedPolicyName(policy), "IOS-CORPORATE-PHONE-BASELINE-L1-LAB-v1");
});

test("built CLI exposes the offline MDM command family", () => {
  const help = execFileSync(process.execPath, ["dist/src/cli.js", "help"], { encoding: "utf8" });
  assert.match(help, /rexp mdm verify-sources/u);
  assert.match(help, /rexp mdm generate/u);
});

test("offline validation and regeneration are deterministic", () => {
  const root = createFixture();
  assert.equal(validateMdm(root).ok, true);
  assert.deepEqual(verifyMdmSources(root), []);
  const first = generateMdm(root);
  const firstManifest = readFileSync(join(root, "mdm/generated/relution-policy-workbench/manifest.json"), "utf8");
  const second = generateMdm(root);
  const secondManifest = readFileSync(join(root, "mdm/generated/relution-policy-workbench/manifest.json"), "utf8");
  assert.deepEqual(second, first);
  assert.equal(secondManifest, firstManifest);
  assert.deepEqual(diffMdm(root), { ok: true, missing: [], changed: [], unexpected: [] });
});

test("MDM YAML loading rejects custom tags", () => {
  const root = mkdtempSync(join(tmpdir(), "mdm-yaml-custom-tag-"));
  write(root, "mdm/policies/apple/test.yaml", "value: !!js/function >\n  function () { return process.env; }\n");
  assert.throws(() => loadMdmPolicySources(root), /unknown tag/u);
});

test("MDM YAML loading rejects multiple documents", () => {
  const root = mkdtempSync(join(tmpdir(), "mdm-yaml-multiple-documents-"));
  write(root, "mdm/policies/apple/test.yaml", "policy_id: first\n---\npolicy_id: second\n");
  assert.throws(() => loadMdmPolicySources(root), /Expected exactly one YAML document/u);
});

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mdm-phase-b-"));
  const pdfPath = "private/source-pdfs-cache/source.pdf";
  const pdf = Buffer.from("fixture pdf evidence", "utf8");
  write(root, pdfPath, pdf);
  writeJson(root, "mdm/evidence/source-manifest.json", {
    sources: [{ id: "source", title: "Source", publisher: "BSI", version: "1", date: "2026-01-01", sha256: createHash("sha256").update(pdf).digest("hex"), local_path: pdfPath, licence: "fixture", scope: "fixture", extraction: { status: "extracted", pages: 1, text_sha256: "a".repeat(64), engine: "fixture" } }],
  });
  writeJson(root, "mdm/policies/apple/test.yaml", policy);
  writeJson(root, "mdm/controls/control-catalogue.yaml", {
    common: { residual_and_bypass_risk: "fixture", review_frequency: "annual" },
    controls: [{ control_id: "MDM-AUTH-001", title: "Authentication", classification: "mandatory", sources: ["SOURCE:1"], applicability: { prerequisites: [] }, configuration: { baseline: "enabled", variants: [] }, impacts: {}, relution: {}, verification: "fixture", exceptions: {} }],
  });
  writeJson(root, "mdm/schemas/mdm-policy-source.schema.json", {
    type: "object",
    required: Object.keys(policy),
    properties: Object.fromEntries(Object.keys(policy).map((key) => [key, {}])),
  });
  writeJson(root, "mdm/schemas/mdm-control.schema.json", {});
  writeJson(root, "mdm/schemas/mdm-test-evidence.schema.json", {});
  writeJson(root, "mdm/schemas/mdm-generated-manifest.schema.json", {});
  writeJson(root, "mdm/evidence/test-evidence-template.yaml", {});
  writeJson(root, "data/relution-26.1.1/template-bundle.json", {
    serverVersion: "26.1.1",
    sourceImage: "fixture",
    generatedAt: "2026-01-01T00:00:00Z",
    platforms: ["IOS"],
    enrollmentTypes: ["IOS"],
    schemas: { IosPasscodeConfiguration: { type: "object", required: ["type"], properties: { type: { type: "string" }, minLength: { type: "integer" } } } },
    configurationTypes: [{ type: "IOS_PASSCODE", label: "iOS Passcode", schemaName: "IosPasscodeConfiguration", platforms: ["IOS"], enrollmentTypes: ["IOS"], multiConfig: false, portalHidden: false, placeholders: [], required: ["type"], fields: [{ path: "minLength", label: "Minimum length", kind: "integer", required: false, nullable: false, enumValues: [], enumLabels: {} }] }],
    iosSystemApps: {},
    springConfigurationMetadata: {},
  });
  return root;
}

function writeJson(root: string, path: string, value: unknown): void {
  write(root, path, `${JSON.stringify(value, null, 2)}\n`);
}

function write(root: string, path: string, value: string | Buffer): void {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, value);
}
