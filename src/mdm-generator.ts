import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { MdmGeneratedFile, MdmGeneratedManifest, MdmPolicySource } from "./mdm-types.js";
import { generatedPolicyName, loadMdmPolicySources, loadMdmSourceManifest, validateMdm, verifyMdmSources } from "./mdm-validation.js";
import { packPlainDirectory, verifyRexp } from "./rexp.js";
import { loadTemplateBundle } from "./templates.js";
import { loadWorkspace, validateWorkspace } from "./workspace.js";

const GENERATED_ROOT = "mdm/generated/relution-policy-workbench";

export function generateMdm(root = process.cwd()): MdmGeneratedManifest {
  const validation = validateMdm(root);
  const sourceIssues = verifyMdmSources(root);
  const errors = [...validation.issues.filter((issue) => issue.severity === "error"), ...sourceIssues];
  if (errors.length > 0) throw new Error(`MDM generation blocked:\n${errors.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`);
  const outputRoot = resolve(root, GENERATED_ROOT, "LAB");
  rmSync(outputRoot, { recursive: true, force: true });
  const files: MdmGeneratedFile[] = [];
  const artifacts: MdmGeneratedManifest["artifacts"] = [];
  const manualValues = new Set<string>();
  const templateBundle = loadTemplateBundle(resolve(root, "data/relution-26.1.1/template-bundle.json"));
  const sources = loadMdmPolicySources(root).filter(({ source }) => source.status === "active");
  for (const { path: sourcePath, source } of sources.sort((left, right) => left.source.policy_id.localeCompare(right.source.policy_id))) {
    for (const placeholder of source.environment_placeholders) manualValues.add(placeholder);
    const name = generatedPolicyName(source);
    writeGenerated(root, `${GENERATED_ROOT}/LAB/${name}.ruleset.json`, rulesetFor(source, name), "ruleset", files);
    const workspacePath = `${GENERATED_ROOT}/LAB/workspaces/${name}`;
    for (const [path, value] of Object.entries(workspaceFor(source, name))) {
      writeGenerated(root, `${workspacePath}/${path}`, value, "workspace", files);
    }
    const workspaceValidation = validateWorkspace(loadWorkspace(resolve(root, workspacePath)), templateBundle);
    if (!workspaceValidation.ok) throw new Error(`Generated workspace ${name} violates the Relution 26.1.1 schema: ${JSON.stringify(workspaceValidation.errors)}`);
    artifacts.push({
      policy_id: source.policy_id,
      source_path: sourcePath,
      ruleset_path: `${GENERATED_ROOT}/LAB/${name}.ruleset.json`,
      workspace_path: workspacePath,
      prerequisites: [...source.dependencies].sort(),
      required_manual_values: [...source.environment_placeholders].sort(),
      expected_create_update_behavior: "create-or-explicit-update-after-human-diff",
      rollback_reference: "mdm/runbooks/operations.md#backup-recovery-and-rollback",
      syntax_validated: true,
      schema_validated: true,
      roundtrip_imported_in_lab: false,
      applied_to_test_device: false,
      rollback_tested: false,
      production_approved: false,
    });
  }
  const sourceHashRows: Array<[string, string]> = loadMdmSourceManifest(root).sources.map((source) => [source.id, source.sha256!]);
  sourceHashRows.sort(([left], [right]) => left.localeCompare(right));
  const sourceHashes = Object.fromEntries(sourceHashRows);
  const manifest: MdmGeneratedManifest = {
    schema_version: 1,
    relution_version: "26.1.1",
    generated_ring: "LAB",
    status: "REFERENCE_VALIDATED",
    production_ready: false,
    source_hashes: sourceHashes,
    output_hashes: files.sort((left, right) => left.path.localeCompare(right.path)),
    artifacts,
    import_behavior: "create-or-explicit-update-after-human-diff",
    required_manual_values: [...manualValues].sort(),
    archive_generation: {
      runtime_key_env: "RELUTION_REXP_KEY",
      output_lane: "private/mdm-archives/LAB",
      deterministic_manifest_excludes_encrypted_archive_hashes: true,
    },
    validation: {
      syntax_validated: true,
      schema_validated: true,
      roundtrip_imported_in_lab: false,
      applied_to_test_device: false,
      rollback_tested: false,
      production_approved: false,
    },
  };
  const manifestSchema = JSON.parse(readFileSync(resolve(root, "mdm/schemas/mdm-generated-manifest.schema.json"), "utf8")) as Record<string, unknown>;
  const validateManifest = new Ajv2020({ allErrors: true, strict: false }).compile(manifestSchema);
  if (!validateManifest(manifest)) throw new Error(`Generated manifest violates its schema: ${JSON.stringify(validateManifest.errors)}`);
  writeStableJson(resolve(root, GENERATED_ROOT, "manifest.json"), manifest);
  generateEncryptedArchives(root, artifacts);
  return manifest;
}

export function readGeneratedManifest(root = process.cwd()): MdmGeneratedManifest {
  return JSON.parse(readFileSync(resolve(root, GENERATED_ROOT, "manifest.json"), "utf8")) as MdmGeneratedManifest;
}

export function diffMdm(root = process.cwd()): { ok: boolean; missing: string[]; changed: string[]; unexpected: string[] } {
  const manifest = readGeneratedManifest(root);
  const missing: string[] = [];
  const changed: string[] = [];
  for (const output of manifest.output_hashes) {
    const path = resolve(root, output.path);
    try {
      if (sha256(readFileSync(path)) !== output.sha256) changed.push(output.path);
    } catch {
      missing.push(output.path);
    }
  }
  const expected = new Set(manifest.output_hashes.map((output) => output.path));
  const unexpected = listGeneratedFiles(resolve(root, GENERATED_ROOT, "LAB"))
    .map((path) => relative(root, path))
    .filter((path) => !expected.has(path));
  return { ok: missing.length === 0 && changed.length === 0 && unexpected.length === 0, missing, changed, unexpected };
}

function rulesetFor(source: MdmPolicySource, name: string): unknown {
  return {
    schema_version: 1,
    policy_id: source.policy_id,
    generated_name: name,
    platform: source.platform,
    enrollment_model: source.enrollment_model,
    ring: "LAB",
    layer: source.layer,
    controls: [...source.controls].sort(),
    dependencies: [...source.dependencies].sort(),
    configurations: source.settings.map((setting) => ({
      type: setting.configuration_type,
      control_ids: [...setting.control_ids].sort(),
      values: sortJson({ enabled: true, type: setting.configuration_type, ...setting.values }),
    })).sort((left, right) => left.type.localeCompare(right.type)),
    production_ready: false,
  };
}

function workspaceFor(source: MdmPolicySource, name: string): Record<string, unknown> {
  const policyUuid = stableUuid(`policy:${source.policy_id}`);
  const versionUuid = stableUuid(`version:${source.policy_id}`);
  const configurations = source.settings.map((setting) => ({
    uuid: stableUuid(`configuration:${source.policy_id}:${setting.configuration_type}`),
    createdBy: "reference-generator",
    creationDate: 0,
    modifiedBy: "reference-generator",
    modificationDate: 0,
    details: { uuid: stableUuid(`details:${source.policy_id}:${setting.configuration_type}`), enabled: true, type: setting.configuration_type, ...setting.values },
  })).sort((left, right) => String(left.details.type).localeCompare(String(right.details.type)));
  const policy = {
    uuid: policyUuid, createdBy: "reference-generator", creationDate: 0, modifiedBy: "reference-generator", modificationDate: 0,
    organizationUuid: null, name, description: `Reference-only ${source.model} ${source.purpose}; LAB assignment only`, platform: source.platform,
    payloadUuid: null, deletedBy: null, deletionDate: null,
    versions: [{ uuid: versionUuid, createdBy: "reference-generator", creationDate: 0, modifiedBy: "reference-generator", modificationDate: 0, version: 1, state: "PUBLISHED", name: "Version 1", description: null, publisher: null, publishDate: null, configurations }],
  };
  const report = {
    policiesToExport: [], exportedPolicies: { [policyUuid]: name }, failedPolicies: {},
    exportFile: { uuid: null, name: null, contentType: null, size: 0, modificationDate: 0, properties: {}, hashcode: null, link: null },
  };
  return {
    "metadata.json": { version: 1, type: "POLICY", serverVersion: "26.1.1", cipherSpecVersion: 1, digestSpecVersion: 1, archiveFormatVersion: 1, fileFormatVersion: 1 },
    "report.json": report,
    [`policies/policy_${policyUuid}.json`]: policy,
  };
}

function writeGenerated(root: string, path: string, value: unknown, kind: MdmGeneratedFile["kind"], files: MdmGeneratedFile[]): void {
  const serialized = `${JSON.stringify(sortJson(value), null, 2)}\n`;
  writeStableText(resolve(root, path), serialized);
  files.push({ path, sha256: sha256(serialized), kind });
}

function generateEncryptedArchives(root: string, artifacts: MdmGeneratedManifest["artifacts"]): void {
  const key = process.env.RELUTION_REXP_KEY;
  if (key === undefined || key.length === 0) return;
  if (key.length < 16 || /^(?:password|changeme|change_me|secret|key123)$/iu.test(key)) throw new Error("RELUTION_REXP_KEY must be at least 16 characters and not an obvious default");
  const archiveRoot = resolve(root, "private/mdm-archives/LAB");
  rmSync(archiveRoot, { recursive: true, force: true });
  for (const artifact of artifacts) {
    const output = resolve(archiveRoot, `${artifact.policy_id}.rexp`);
    packPlainDirectory(resolve(root, artifact.workspace_path), output, key, { force: true });
    if (!verifyRexp(output, key).ok) throw new Error(`Generated archive failed verification: ${relative(root, output)}`);
  }
}

function writeStableJson(path: string, value: unknown): void { writeStableText(path, `${JSON.stringify(sortJson(value), null, 2)}\n`); }
function writeStableText(path: string, value: string): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); }
function sha256(value: Buffer | string): string { return createHash("sha256").update(value).digest("hex"); }
function stableUuid(seed: string): string { const hash = createHash("sha256").update(seed).digest("hex").slice(0, 32).toUpperCase(); return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-A${hash.slice(17, 20)}-${hash.slice(20)}`; }
function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, sortJson(child)]));
  return value;
}

function listGeneratedFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? listGeneratedFiles(resolve(path, entry.name)) : [resolve(path, entry.name)])
    .sort();
}
