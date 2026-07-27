/** Parses strict on-disk Zammad operation record shapes. */
import { isValidZammadTicketNumber } from "./zammad-api.js";
import { OPERATION_VERSION, type PersistedOperation, type PersistedTicketResult } from "./zammad-operation-contract.js";
import { validOperationId } from "./zammad-operation-paths.js";

export function parseOperation(value: unknown, expectedId: string): PersistedOperation {
  if (!isPlainRecord(value) || value.version !== OPERATION_VERSION || value.id !== expectedId || !validOperationId(expectedId) || typeof value.updatedAt !== "string" || !isExactIsoDate(value.updatedAt)) throw new Error("Invalid Zammad operation record");
  if (value.state === "started" && Object.keys(value).length === 4) return { version: OPERATION_VERSION, id: expectedId, state: "started", updatedAt: value.updatedAt };
  if (value.state === "completed" && Object.keys(value).length === 5) return { version: OPERATION_VERSION, id: expectedId, state: "completed", updatedAt: value.updatedAt, result: parsePersistedResult(value.result) };
  throw new Error("Invalid Zammad operation record");
}

function parsePersistedResult(value: unknown): PersistedTicketResult {
  if (!isPlainRecord(value) || Object.keys(value).length === 0 || Object.keys(value).some((key) => key !== "id" && key !== "number")) throw new Error("Invalid Zammad ticket result");
  const id = value.id;
  const number = value.number;
  if (id !== undefined && (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0)) throw new Error("Invalid Zammad ticket id");
  if (number !== undefined && !isValidZammadTicketNumber(number)) throw new Error("Invalid Zammad ticket number");
  if (id === undefined && number === undefined) throw new Error("Missing Zammad ticket identifier");
  return { ...(typeof id === "number" ? { id } : {}), ...(typeof number === "string" ? { number } : {}) };
}

function isExactIsoDate(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
