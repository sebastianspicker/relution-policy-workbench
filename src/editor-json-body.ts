/** Reads bounded JSON request bodies after their mutation queue is acquired. */
import type { IncomingMessage } from "node:http";
import { badRequest, HttpError, type JsonRecord } from "./editor-http-input.js";
import { assertJsonShapeWithinLimits } from "./editor-json-shape-limits.js";
import { decodeStrictUtf8 } from "./strict-utf8.js";

const DEFAULT_JSON_BODY_LIMIT_BYTES = 1024 * 1024;

/** Caps both body bytes and JSON shape to bound work before route validation. */
export async function readJsonBody(request: IncomingMessage, limitBytes = DEFAULT_JSON_BODY_LIMIT_BYTES): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > limitBytes) {
      throw new HttpError(413, `JSON body exceeds ${String(limitBytes)} bytes`);
    }
    chunks.push(buffer);
  }
  let text: string;
  try {
    text = decodeStrictUtf8(Buffer.concat(chunks), "JSON body");
  } catch {
    throw badRequest("Invalid UTF-8 JSON body");
  }
  assertJsonShapeWithinLimits(text);
  return parseJsonRecord(text);
}

function parseJsonRecord(text: string): JsonRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.length === 0 ? "{}" : text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw badRequest(`Invalid JSON body: ${message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw badRequest("Expected JSON object body");
  }
  return parsed as JsonRecord;
}
