/** Makes optional OpenAPI object properties compatible with workspace JSON. */
import type { JsonRecord } from "./utils/json-guards.js";

export function allowNull(schema: unknown): unknown {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return schema;
  }

  const record = schema as JsonRecord;
  if (record.nullable === true) {
    return record;
  }
  if (typeof record.$ref === "string" || record.allOf !== undefined || record.oneOf !== undefined || record.anyOf !== undefined) {
    return { anyOf: [record, { type: "null" }] };
  }
  const nullable = { ...record };
  if (typeof nullable.type === "string") {
    nullable.type = nullable.type === "null" ? "null" : [nullable.type, "null"];
  } else if (Array.isArray(nullable.type)) {
    const types = nullable.type.filter((entry): entry is string => typeof entry === "string");
    nullable.type = types.includes("null") ? types : [...types, "null"];
  } else {
    nullable.nullable = true;
  }
  if (Array.isArray(nullable.enum) && !nullable.enum.includes(null)) {
    nullable.enum = [...nullable.enum, null];
  }
  return nullable;
}
