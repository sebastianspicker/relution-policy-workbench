import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import yaml from "js-yaml";

const root = process.cwd();
const fail = (message) => {
  throw new Error(`MDM source validation failed: ${message}`);
};
const loadYaml = (path) => {
  const documents = [];
  yaml.loadAll(readFileSync(join(root, path), "utf8"), (document) => documents.push(document), { schema: yaml.JSON_SCHEMA });
  if (documents.length !== 1 || documents[0] === undefined) fail(`${path} must contain exactly one YAML document`);
  return documents[0];
};

const inventory = loadYaml("mdm/inventory/current-state.yaml");
const catalogue = loadYaml("mdm/controls/control-catalogue.yaml");
const ledger = loadYaml("mdm/controls/source-ledger.yaml");
const exception = loadYaml("mdm/exceptions/exception-template.yaml");

if (inventory?.tenant_evidence_state !== "NOT_EVIDENCED") {
  fail("tenant state must remain NOT_EVIDENCED until a sanitised inventory is supplied");
}
for (const input of inventory?.critical_inputs ?? []) {
  if (input.state !== "NOT_EVIDENCED") fail(`${input.id} claims evidence without an evidence record`);
}
for (const [name, rows] of Object.entries(inventory?.inventories ?? {})) {
  if (!Array.isArray(rows)) fail(`inventory ${name} must be an array`);
}

const sourceIds = new Set((ledger?.sources ?? []).map((source) => source.id));
const controls = catalogue?.controls ?? [];
if (catalogue?.status !== "APPROVED" || catalogue?.generated_relution_json_allowed !== true) {
  fail("reference architecture must be APPROVED before Phase B generation");
}
const controlIds = new Set();
const classifications = new Set(catalogue?.classification_values ?? []);
const required = [
  "control_id", "title", "classification", "objective", "sources", "platforms",
  "applicability", "configuration", "impacts", "rationale", "relution",
  "verification", "exceptions",
];

for (const control of controls) {
  for (const field of required) {
    if (control[field] === undefined || control[field] === null) fail(`${control.control_id ?? "unknown"} lacks ${field}`);
  }
  if (controlIds.has(control.control_id)) fail(`duplicate control ID ${control.control_id}`);
  controlIds.add(control.control_id);
  if (!classifications.has(control.classification)) fail(`${control.control_id} has invalid classification`);
  for (const reference of control.sources) {
    const sourceId = String(reference).split(":", 1)[0];
    if (!sourceIds.has(sourceId)) fail(`${control.control_id} references unknown source ${sourceId}`);
  }
}

for (const id of exception?.affected_control_ids ?? []) {
  if (!controlIds.has(id)) fail(`exception template references unknown control ${id}`);
}
if (exception?.rules?.permanent !== false || exception?.rules?.expiry_required !== true) {
  fail("exception template must prohibit permanent exceptions and require expiry");
}

const generated = readdirSync(join(root, "mdm/generated/relution-policy-workbench"));
if (generated.some((name) => !["README.md", "LAB", "manifest.json"].includes(name))) {
  fail("only LAB artifacts and their manifest may be generated before promotion gates pass");
}

console.log(`MDM source validation passed: ${controls.length} controls, ${sourceIds.size} source families, LAB-only generation boundary.`);
