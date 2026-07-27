/** Parses Zammad editor connection and ticket request bodies. */
import { optionalRecord, optionalString, requireString } from "./editor-api-request-input.js";
import { assignOptionalHttpConnectionFields } from "./editor-connection-request-input.js";
import { badRequest } from "./editor-http-input.js";
import type { ZammadConnectionInput } from "./zammad-api.js";
import type { ZammadTicketDraft } from "./zammad-ticket-drafts.js";

export function parseZammadConnectionInput(body: Record<string, unknown>): ZammadConnectionInput {
  const input: ZammadConnectionInput = {
    host: requireString(body, "host"),
    apiToken: requireString(body, "apiToken"),
    group: requireString(body, "group"),
    customer: requireString(body, "customer"),
  };
  assignOptionalHttpConnectionFields(input, body);
  return input;
}

export function parseTicketDraft(body: Record<string, unknown>): ZammadTicketDraft {
  const record = optionalRecord(body, "draft");
  if (record === undefined) throw badRequest("Expected draft object");
  const kind = requireString(record, "kind");
  if (kind !== "non-compliant-device" && kind !== "inactive-device") {
    throw badRequest(`Unsupported Zammad ticket kind: ${kind}`);
  }
  if (typeof record.title !== "string" || typeof record.body !== "string" || typeof record.issueId !== "string") {
    throw badRequest("Ticket draft requires title, body, and issueId strings");
  }
  const ticketDraft: ZammadTicketDraft = {
    kind,
    title: requireString(record, "title"),
    body: requireString(record, "body"),
    issueId: requireString(record, "issueId"),
  };
  const deviceUuid = optionalString(record, "deviceUuid");
  if (deviceUuid !== undefined) ticketDraft.deviceUuid = deviceUuid;
  return ticketDraft;
}
