/** Reads and mutates JSON object paths while rejecting prototype-polluting segments. */
import { asRecord } from "../../../src/utils/json-guards.js";
import type { JsonRecord } from "./types.js";

const UNSAFE_OBJECT_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

export function getPath(record: JsonRecord, path: string): unknown {
  const segments = safePathSegments(path);
  if (segments === undefined) {
    return undefined;
  }
  let cursor: unknown = record;
  for (const segment of segments) {
    const current = asRecord(cursor);
    if (current === undefined) {
      return undefined;
    }
    cursor = Object.getOwnPropertyDescriptor(current, segment)?.value;
  }
  return cursor;
}

export function setPath(record: JsonRecord, path: string, value: unknown): void {
  const segments = requiredPathSegments(path);
  const last = segments.pop();
  if (last === undefined) {
    return;
  }
  const cursor = parentRecord(record, segments, true);
  if (cursor === undefined) {
    throw new Error(`Could not create object path: ${path}`);
  }
  cursor[last] = value;
}

export function deletePath(record: JsonRecord, path: string): void {
  const segments = safePathSegments(path);
  if (segments === undefined) {
    return;
  }
  const last = segments.pop();
  if (last === undefined) {
    return;
  }
  delete parentRecord(record, segments, false)?.[last];
}

function parentRecord(record: JsonRecord, segments: string[], create: boolean): JsonRecord | undefined {
  let cursor = record;
  for (const segment of segments) {
    const next = asRecord(Object.getOwnPropertyDescriptor(cursor, segment)?.value);
    if (next !== undefined) {
      cursor = next;
    } else if (create) {
      Object.defineProperty(cursor, segment, { value: {}, enumerable: true, configurable: true, writable: true });
      cursor = Object.getOwnPropertyDescriptor(cursor, segment)?.value as JsonRecord;
    } else {
      return undefined;
    }
  }
  return cursor;
}

function requiredPathSegments(path: string): string[] {
  const segments = safePathSegments(path);
  if (segments === undefined) {
    throw new Error(`Unsafe object path segment: ${path}`);
  }
  return segments;
}

function safePathSegments(path: string): string[] | undefined {
  const segments = path.split(".");
  return segments.every(isSafeObjectPathSegment) ? segments : undefined;
}

function isSafeObjectPathSegment(segment: string): boolean {
  return !UNSAFE_OBJECT_PATH_SEGMENTS.has(segment);
}
