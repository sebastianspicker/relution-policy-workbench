/** Covers Apple compatibility schema validation edge cases. */
import assert from "node:assert/strict";
import test from "node:test";
import { type AppleSchemaEntry, createAppleSchemaProfileConfiguration, extractAppleSchemaPayloadBodyJson } from "../src/apple-schema.js";
import { loadTemplateBundle } from "../src/templates.js";
import { inspectMobileConfigText } from "../src/plist.js";
import { type SchemaCompatibilityIssue, schemaCompatibilityIssues, validateWorkspace } from "../src/workspace.js";
import { parseJsonRecord } from "./rexp-helpers.js";
import { createSchemaCompatibilityFixture, createSchemaCompatibilityWorkspace } from "./rexp-apple-compat-fixtures.js";

test("detects opaque signed mobileconfig input without XML parsing", () => {
  const inspection = inspectMobileConfigText("-----BEGIN PKCS7-----\nopaque\n-----END PKCS7-----");

  assert.equal(inspection.signatureState, "signed-opaque");
  assert.equal(inspection.displayName, "Custom .mobileconfig");
});

test("emits plist data nodes for Apple schema data fields", () => {
  const entry: AppleSchemaEntry = {
    id: "profile:com.example.data",
    kind: "profile",
    title: "Data Payload",
    description: "",
    identifier: "com.example.data",
    sourcePath: "local/Data.yaml",
    availability: {
      platforms: ["IOS"],
      allowMultiple: true,
      requiresMdm: false,
      deprecated: false,
      notes: [],
    },
    deprecated: false,
    fields: [
      {
        path: "payloadBlob",
        payloadKey: "PayloadBlob",
        title: "Payload blob",
        kind: "data",
        required: true,
        description: "",
        defaultValue: "",
        enumValues: [],
        variableSafe: false,
      },
    ],
  };

  const configuration = createAppleSchemaProfileConfiguration(entry, { payloadBlob: "QUJDREVGRw==" });
  const details = configuration.details as Record<string, unknown>;
  const payloadBody = parseJsonRecord(extractAppleSchemaPayloadBodyJson(details, entry));

  assert.equal(payloadBody.PayloadBlob, "QUJDREVGRw==");
  assert.match(String(details.rawContent), /<data>QUJDREVGRw==<\/data>/);
});

test("records schema compatibility issues instead of throwing on Java regex patterns", () => {
  const bundle = loadTemplateBundle();
  const issues = schemaCompatibilityIssues(bundle);

  assert.equal(hasSchemaCompatibilityIssue(issues, "Organization", "Organization.properties.email", "IsAlphabetic"), true);
  assert.equal(hasSchemaCompatibilityIssue(issues, "IotUpdateConfiguration", "IotUpdateConfiguration.allOf[1].properties.serverUrl", "https?"), true);
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

test("reports schema compatibility issue counts on otherwise valid workspaces", () => {
  const bundle = createSchemaCompatibilityFixture("\\p{IsAlphabetic}+");
  const workspace = createSchemaCompatibilityWorkspace("123");
  const validation = validateWorkspace(workspace, bundle);

  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.schemaCompatibilityIssueCount, 1);
});

test("reports zero schema compatibility issues when validation schemas need no sanitizing", () => {
  const bundle = createSchemaCompatibilityFixture("^[A-Za-z]+$");
  const workspace = createSchemaCompatibilityWorkspace("abc");
  const validation = validateWorkspace(workspace, bundle);

  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.schemaCompatibilityIssueCount, 0);
});
