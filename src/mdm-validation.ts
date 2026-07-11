import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import yaml from "js-yaml";
import type {
  MdmControl,
  MdmPolicySource,
  MdmSourceManifestEntry,
  MdmValidationIssue,
  MdmValidationReport,
} from "./mdm-types.js";
import { asRecord } from "./utils/json-guards.js";

interface SourceManifest { sources: MdmSourceManifestEntry[] }
interface TemplateField { path: string; kind: string; enumValues: unknown[] }
interface ConfigurationTemplate { type: string; platforms: string[]; enrollmentTypes: string[]; fields: TemplateField[] }
interface TemplateBundle { serverVersion: string; configurationTypes: ConfigurationTemplate[] }

const POLICY_SCHEMA = "mdm/schemas/mdm-policy-source.schema.json";
const CONTROL_SCHEMA = "mdm/schemas/mdm-control.schema.json";
const TEST_EVIDENCE_SCHEMA = "mdm/schemas/mdm-test-evidence.schema.json";
const SOURCE_MANIFEST = "mdm/evidence/source-manifest.json";
const TEMPLATE_BUNDLE = "data/relution-26.1.1/template-bundle.json";
const SECRET_KEY = /(?:password|passphrase|private.?key|client.?secret|api.?token|preshared.?key)/iu;
const PLACEHOLDER = /^\$\{ENV:[A-Z][A-Z0-9_]*\}$/u;

export function loadMdmPolicySources(root = process.cwd()): Array<{ path: string; source: MdmPolicySource }> {
  const policyRoot = resolve(root, "mdm/policies");
  return listFiles(policyRoot)
    .filter((path) => /\.ya?ml$/u.test(path))
    .map((path) => ({ path: relative(root, path), source: yaml.load(readFileSync(path, "utf8")) as MdmPolicySource }));
}

export function loadMdmSourceManifest(root = process.cwd()): SourceManifest {
  return JSON.parse(readFileSync(resolve(root, SOURCE_MANIFEST), "utf8")) as SourceManifest;
}

export function verifyMdmSources(root = process.cwd()): MdmValidationIssue[] {
  const issues: MdmValidationIssue[] = [];
  const manifest = loadMdmSourceManifest(root);
  const seen = new Set<string>();
  for (const source of manifest.sources) {
    if (seen.has(source.id)) issues.push(error(SOURCE_MANIFEST, `duplicate source ID ${source.id}`));
    seen.add(source.id);
    const path = resolve(root, source.local_path);
    if (!existsSync(path)) {
      issues.push(error(source.local_path, `required source is missing (${source.title})`));
      continue;
    }
    if (!source.local_path.startsWith("private/source-pdfs-cache/") || lstatSync(path).isSymbolicLink()) {
      issues.push(error(source.local_path, "source must be a regular file in the ignored PDF cache"));
      continue;
    }
    const actual = sha256(readFileSync(path));
    if (source.sha256 === null || actual !== source.sha256) issues.push(error(source.local_path, `SHA-256 mismatch: expected ${String(source.sha256)}, got ${actual}`));
    if (source.extraction.status !== "extracted" || source.extraction.pages === null || source.extraction.text_sha256 === null) {
      issues.push(error(source.local_path, `source extraction state is ${source.extraction.status}`));
    }
  }
  return issues;
}

export function validateMdm(root = process.cwd()): MdmValidationReport {
  const issues: MdmValidationIssue[] = [];
  const policies = loadMdmPolicySources(root);
  const bundle = loadJson<TemplateBundle>(resolve(root, TEMPLATE_BUNDLE));
  const catalogue = loadControlCatalogue(root);
  const controlIds = new Set(catalogue.controls.map((control) => control.control_id));
  const schema = loadJson<Record<string, unknown>>(resolve(root, POLICY_SCHEMA));
  const validateSchema = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  const policyIds = new Set<string>();
  const generatedNames = new Set<string>();
  const templates = new Map(bundle.configurationTypes.map((template) => [template.type, template]));

  validateControlCatalogue(root, catalogue, issues);
  validateTestEvidenceTemplate(root, issues);

  if (bundle.serverVersion !== "26.1.1") issues.push(error(TEMPLATE_BUNDLE, `expected Relution 26.1.1, got ${bundle.serverVersion}`));
  for (const { path, source } of policies) {
    if (!validateSchema(source)) issues.push(...schemaIssues(path, validateSchema.errors ?? []));
    if (policyIds.has(source.policy_id)) issues.push(error(path, `duplicate policy ID ${source.policy_id}`));
    policyIds.add(source.policy_id);
    for (const control of [...source.controls, ...source.settings.flatMap((setting) => setting.control_ids)]) {
      if (!controlIds.has(control)) issues.push(error(path, `unknown control reference ${control}`));
    }
    if (source.production_ready) issues.push(error(path, "reference sources must not claim production readiness"));
    if (source.status === "active" && (source.rings.length !== 1 || source.rings[0] !== "LAB")) issues.push(error(path, "active sources may initially generate LAB only"));
    if (source.status !== "active" && source.settings.length > 0) issues.push(error(path, `${source.status} sources must not contain deployable settings`));
    const name = generatedPolicyName(source);
    if (generatedNames.has(name)) issues.push(error(path, `duplicate generated name ${name}`));
    generatedNames.add(name);
    validateSettings(path, source, templates, issues);
  }
  for (const { path, source } of policies) {
    for (const dependency of source.dependencies) {
      if (!policyIds.has(dependency)) issues.push(error(path, `unknown policy dependency ${dependency}`));
    }
  }
  validateComposition(policies, issues);
  const manifest = loadMdmSourceManifest(root);
  const missing = manifest.sources.filter((source) => source.extraction.status !== "extracted");
  for (const source of missing) issues.push(warning(source.local_path, `offline evidence is ${source.extraction.status}; verify-sources and generate remain blocked`));
  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    relution_version: bundle.serverVersion,
    source_count: manifest.sources.length,
    policy_count: policies.length,
    active_policy_count: policies.filter(({ source }) => source.status === "active").length,
    issues,
  };
}

export function generatedPolicyName(source: MdmPolicySource): string {
  const segment = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return `${segment(source.platform)}-${segment(source.model)}-${segment(source.purpose)}-L${source.layer}-LAB-v1`;
}

function validateSettings(path: string, source: MdmPolicySource, templates: Map<string, ConfigurationTemplate>, issues: MdmValidationIssue[]): void {
  const seenTypes = new Set<string>();
  const declaredPlaceholders = new Set(source.environment_placeholders);
  for (const setting of source.settings) {
    if (Object.keys(setting.values).length === 0) issues.push(error(path, `${setting.configuration_type} must declare explicit values`));
    const template = templates.get(setting.configuration_type);
    if (template === undefined) {
      issues.push(error(path, `unsupported configuration type ${setting.configuration_type}`));
      continue;
    }
    if (seenTypes.has(setting.configuration_type)) issues.push(error(path, `duplicate configuration type ${setting.configuration_type}`));
    seenTypes.add(setting.configuration_type);
    if (!template.platforms.includes(source.platform)) issues.push(error(path, `${setting.configuration_type} does not support ${source.platform}`));
    if (!template.enrollmentTypes.includes(source.enrollment_model)) issues.push(error(path, `${setting.configuration_type} does not support enrollment ${source.enrollment_model}`));
    const fields = new Map(template.fields.map((field) => [field.path, field]));
    for (const [fieldPath, value] of flattenValues(setting.values)) {
      const field = fields.get(fieldPath);
      if (field === undefined) issues.push(error(path, `${setting.configuration_type} has unknown field ${fieldPath}`));
      else validateFieldValue(path, setting.configuration_type, field, value, declaredPlaceholders, issues);
    }
  }
}

function validateComposition(policies: Array<{ path: string; source: MdmPolicySource }>, issues: MdmValidationIssue[]): void {
  const byId = new Map(policies.map((entry) => [entry.source.policy_id, entry]));
  for (const entry of policies) {
    const visiting = new Set<string>();
    const values = new Map<string, string>();
    const visit = (candidate: { path: string; source: MdmPolicySource }): void => {
      if (visiting.has(candidate.source.policy_id)) {
        issues.push(error(entry.path, `dependency cycle includes ${candidate.source.policy_id}`));
        return;
      }
      visiting.add(candidate.source.policy_id);
      for (const dependency of candidate.source.dependencies) {
        const dependencySource = byId.get(dependency);
        if (dependencySource !== undefined) visit(dependencySource);
      }
      for (const setting of candidate.source.settings) {
        for (const [field, value] of flattenValues(setting.values)) {
          const key = `${setting.configuration_type}.${field}`;
          const serialized = JSON.stringify(value);
          const previous = values.get(key);
          if (previous !== undefined && previous !== serialized) issues.push(error(entry.path, `conflicting composed value for ${key}`));
          values.set(key, serialized);
        }
      }
      visiting.delete(candidate.source.policy_id);
    };
    visit(entry);
  }
}

function validateFieldValue(path: string, type: string, field: TemplateField, value: unknown, placeholders: Set<string>, issues: MdmValidationIssue[]): void {
  if (typeof value === "string" && value.startsWith("${")) {
    if (!PLACEHOLDER.test(value) || !placeholders.has(value)) issues.push(error(path, `${type}.${field.path} has unknown or production placeholder ${value}`));
    return;
  }
  if (SECRET_KEY.test(field.path) && value !== "" && value !== null) issues.push(error(path, `${type}.${field.path} contains a literal secret-like value`));
  if (field.enumValues.length > 0 && !field.enumValues.includes(value)) issues.push(error(path, `${type}.${field.path} has unsupported enumeration ${String(value)}`));
  const expected = field.kind === "integer" ? "number" : field.kind;
  if (["string", "number", "boolean"].includes(expected) && typeof value !== expected) issues.push(error(path, `${type}.${field.path} must be ${expected}`));
}

function flattenValues(value: Record<string, unknown>, prefix = ""): Array<[string, unknown]> {
  const result: Array<[string, unknown]> = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix.length === 0 ? key : `${prefix}.${key}`;
    const record = asRecord(child);
    if (record !== undefined) result.push(...flattenValues(record, path));
    else result.push([path, child]);
  }
  return result;
}

interface LegacyControl { control_id: string; title: string; classification: MdmControl["classification"]; sources: string[]; applicability: Record<string, unknown>; configuration: { baseline?: unknown; variants?: unknown[] }; impacts: Record<string, unknown>; relution: Record<string, unknown>; verification: string; exceptions: Record<string, unknown> }
interface ControlCatalogue { common?: { residual_and_bypass_risk?: string; review_frequency?: string }; controls: LegacyControl[] }

function loadControlCatalogue(root: string): ControlCatalogue {
  return yaml.load(readFileSync(resolve(root, "mdm/controls/control-catalogue.yaml"), "utf8")) as ControlCatalogue;
}

function validateControlCatalogue(root: string, catalogue: ControlCatalogue, issues: MdmValidationIssue[]): void {
  const schema = loadJson<Record<string, unknown>>(resolve(root, CONTROL_SCHEMA));
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  for (const control of catalogue.controls) {
    const normalized: MdmControl = {
      schema_version: 1,
      control_id: control.control_id,
      title: control.title,
      classification: control.classification,
      source_mappings: control.sources.map((reference) => {
        const [source_id = reference, control_reference = reference] = reference.split(":", 2);
        return { source_id, control_reference, page: null, verification_status: "unverifiable" as const };
      }),
      applicability: control.applicability,
      platform_prerequisites: Array.isArray(control.applicability.prerequisites) ? control.applicability.prerequisites.map(String) : [],
      proposed_value: control.configuration.baseline,
      variants: (control.configuration.variants ?? []).map((variant) => ({ value: variant })),
      impacts: control.impacts,
      residual_risk: catalogue.common?.residual_and_bypass_risk ?? "record per model",
      relution_target: control.relution,
      verification: { method: control.verification },
      exception: control.exceptions,
      review_cadence: catalogue.common?.review_frequency ?? "annual-and-on-material-change",
    };
    if (!validate(normalized)) issues.push(...schemaIssues(`mdm/controls/control-catalogue.yaml#${control.control_id}`, validate.errors ?? []));
  }
}

function validateTestEvidenceTemplate(root: string, issues: MdmValidationIssue[]): void {
  const schema = loadJson<Record<string, unknown>>(resolve(root, TEST_EVIDENCE_SCHEMA));
  const validate = new Ajv2020({ allErrors: true, strict: false, validateFormats: false }).compile(schema);
  const evidence = yaml.load(readFileSync(resolve(root, "mdm/evidence/test-evidence-template.yaml"), "utf8"), { schema: yaml.JSON_SCHEMA });
  if (!validate(evidence)) issues.push(...schemaIssues("mdm/evidence/test-evidence-template.yaml", validate.errors ?? []));
}

function listFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? listFiles(join(path, entry.name)) : [join(path, entry.name)]).sort();
}

function schemaIssues(path: string, errors: ErrorObject[]): MdmValidationIssue[] {
  return errors.map((entry) => error(path, `${entry.instancePath || "/"} ${entry.message ?? "is invalid"}`));
}

function loadJson<T>(path: string): T { return JSON.parse(readFileSync(path, "utf8")) as T; }
function sha256(value: Buffer | string): string { return createHash("sha256").update(value).digest("hex"); }
function error(path: string, message: string): MdmValidationIssue { return { severity: "error", path, message }; }
function warning(path: string, message: string): MdmValidationIssue { return { severity: "warning", path, message }; }
