import { asRecord, type JsonRecord } from "./utils/json-guards.js";

const PAYLOAD_SHELL_KEYS = new Set(["PayloadDisplayName", "PayloadIdentifier", "PayloadType", "PayloadUUID", "PayloadVersion"]);

export function parsePayloadKeysJson(value: unknown, label = "payload keys"): JsonRecord {
  const text = typeof value === "string" ? value : "{}";
  const parsed = parseJsonWithContext(text, label);
  const record = asRecord(parsed);
  if (record === undefined) {
    throw new Error(`${label} JSON must be an object`);
  }
  return record;
}

export function parsePayloadBodyJson(value: string, label = "Payload JSON"): JsonRecord {
  const parsed = parseJsonWithContext(value.length === 0 ? "{}" : value, label);
  const record = asRecord(parsed);
  if (record === undefined) {
    throw new Error(`${label} must be an object`);
  }
  return omitPayloadShell(record);
}

export function omitPayloadShell(record: JsonRecord): JsonRecord {
  return recordWithoutKeys(record, PAYLOAD_SHELL_KEYS);
}

export function unknownPayloadOverrides(record: JsonRecord, knownKeys: Set<string>): JsonRecord {
  return recordWithoutKeys(record, knownKeys);
}

export function tryParsePayloadKeysJson(value: unknown): JsonRecord | undefined {
  try {
    return parsePayloadKeysJson(value);
  } catch {
    return undefined;
  }
}

function recordWithoutKeys(record: JsonRecord, excludedKeys: Set<string>): JsonRecord {
  const output: JsonRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (!excludedKeys.has(key)) {
      output[key] = value;
    }
  }
  return output;
}

function parseJsonWithContext(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${label} JSON: ${message}`);
  }
}
