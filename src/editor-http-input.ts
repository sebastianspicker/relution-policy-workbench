/** Defines editor HTTP input failures shared by all route parsers. */
import type { JsonRecord as SharedJsonRecord } from "./utils/json-guards.js";

export type JsonRecord = SharedJsonRecord;

export class HttpError extends Error {
  readonly status: number;
  readonly expose: boolean;

  constructor(status: number, message: string, expose = status < 500) {
    super(message);
    this.status = status;
    this.expose = expose;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}
