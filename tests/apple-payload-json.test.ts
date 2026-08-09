/** Verifies Apple payload JSON parsing keeps only editable payload fields. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  omitPayloadShell,
  parsePayloadBodyJson,
  parsePayloadKeysJson,
  tryParsePayloadKeysJson,
  unknownPayloadOverrides,
} from "../src/apple-payload-json.js";

test("payload JSON readers reject non-object JSON with their contextual messages", () => {
  assert.throws(() => parsePayloadKeysJson("[]", "custom keys"), new Error("custom keys JSON must be an object"));
  assert.throws(() => parsePayloadBodyJson("null", "custom body"), new Error("custom body must be an object"));
});

test("payload JSON readers treat absent keys and an empty body as empty records", () => {
  assert.deepEqual(parsePayloadKeysJson(undefined), {});
  assert.deepEqual(parsePayloadBodyJson(""), {});
  assert.deepEqual(parsePayloadBodyJson("{}"), {});
});

test("payload body removes shell keys while preserving editable payload fields", () => {
  assert.deepEqual(parsePayloadBodyJson(JSON.stringify({
    PayloadDisplayName: "Example",
    PayloadIdentifier: "org.example.payload",
    PayloadType: "com.apple.example",
    PayloadUUID: "UUID",
    PayloadVersion: 1,
    Enabled: true,
  })), { Enabled: true });
  assert.deepEqual(omitPayloadShell({ PayloadType: "com.apple.example", Enabled: true }), { Enabled: true });
});

test("unknown payload overrides filter known keys only", () => {
  assert.deepEqual(
    unknownPayloadOverrides({ Enabled: true, CustomValue: "keep", Nested: { value: 1 } }, new Set(["Enabled"])),
    { CustomValue: "keep", Nested: { value: 1 } },
  );
});

test("best-effort payload-key parsing suppresses malformed JSON while strict readers retain context", () => {
  const malformed = "{";
  assert.equal(tryParsePayloadKeysJson(malformed), undefined);
  assert.throws(
    () => parsePayloadKeysJson(malformed, "custom keys"),
    new Error("Could not parse custom keys JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)"),
  );
  assert.throws(
    () => parsePayloadBodyJson(malformed, "custom body"),
    new Error("Could not parse custom body JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)"),
  );
});
