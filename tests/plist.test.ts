/** Covers plist serialization, inspection, and XML escaping edge cases. */
import assert from "node:assert/strict";
import test from "node:test";
import { buildMobileConfig, inspectMobileConfigText, jsonPayloadKeys, plistValueFromUnknown, type PlistValue } from "../src/plist.js";

test("plist conversion preserves reserved object keys as literal data", () => {
  const parsed = JSON.parse('{"__proto__":{"PayloadType":"evil"},"constructor":"literal","toString":true}') as Record<string, unknown>;
  const converted = plistValueFromUnknown(parsed) as Record<string, PlistValue>;

  assert.equal(Object.getPrototypeOf(converted), null);
  assert.deepEqual(Object.keys(converted).sort(), ["__proto__", "constructor", "toString"]);
  assert.equal(Object.hasOwn(converted, "__proto__"), true);

  const xml = buildMobileConfig(converted);
  assert.match(xml, /<key>__proto__<\/key>/u);
  assert.match(xml, /<key>constructor<\/key>/u);
  assert.match(xml, /<key>toString<\/key>/u);
  assert.match(xml, /<string>evil<\/string>/u);
});

test("JSON payload key conversion uses a prototype-free dictionary", () => {
  const parsed = JSON.parse('{"__proto__":"value"}') as Record<string, unknown>;
  const converted = jsonPayloadKeys(parsed);

  assert.equal(Object.getPrototypeOf(converted), null);
  assert.equal(converted.__proto__, "value");
  assert.equal(Object.hasOwn(converted, "__proto__"), true);
});

test("mobileconfig inspection rejects entity-bearing doctypes without reading forged metadata", () => {
  const inspection = inspectMobileConfigText([
    '<!DOCTYPE plist [<!ENTITY forged "<key>PayloadDisplayName</key><string>Forged</string>">]>',
    '<plist version="1.0"><dict><key>PayloadDisplayName</key><string>Actual</string></dict></plist>',
  ].join("\n"));

  assert.equal(inspection.signatureState, "signed-invalid");
  assert.equal(inspection.displayName, "Custom .mobileconfig");
});

test("mobileconfig inspection ignores metadata-looking XML comments", () => {
  const inspection = inspectMobileConfigText([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict><!-- <key>PayloadDisplayName</key><string>Forged</string> --><key>PayloadDisplayName</key><string>Actual</string></dict></plist>',
  ].join("\n"));

  assert.equal(inspection.signatureState, "unsigned");
  assert.equal(inspection.displayName, "Actual");
});

test("plist serialization refuses non-finite numeric values", () => {
  assert.throws(() => buildMobileConfig({ PayloadVersion: Number.NaN }), /must be finite/u);
});
