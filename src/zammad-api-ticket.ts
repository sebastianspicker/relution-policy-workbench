/** Tests Zammad authentication and creates internally visible ticket notes. */
import type { ZammadTicketDraft } from "./zammad-ticket-drafts.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { strictResponseJson } from "./strict-response-json.js";
import type { ZammadConnection, ZammadConnectionTestResult, ZammadTicketResult } from "./zammad-api-contract.js";
import { zammadFetch } from "./zammad-api-request.js";
import { parseZammadTicketResult } from "./zammad-api-ticket-result.js";
import { asRecord } from "./utils/json-guards.js";

export async function testZammadConnection(
  connection: ZammadConnection,
  transportOptions: HttpServiceTransportOptions = {},
): Promise<ZammadConnectionTestResult> {
  const response = await zammadFetch(connection, "/api/v1/users/me", { method: "GET" }, transportOptions);
  try {
    const raw = asRecord(await strictResponseJson(response, "Zammad connection test"));
    if (!isAuthenticatedZammadUser(raw)) throw new Error("invalid user");
  } catch {
    return {
      ok: false,
      baseUrl: connection.baseUrl,
      reason: "Zammad connection test returned an unexpected current-user response.",
    };
  }
  return { ok: true, baseUrl: connection.baseUrl };
}

export async function createZammadTicket(
  connection: ZammadConnection,
  draft: ZammadTicketDraft,
  transportOptions: HttpServiceTransportOptions = {},
  operationId?: string,
): Promise<ZammadTicketResult> {
  const response = await zammadFetch(connection, "/api/v1/tickets", {
    method: "POST",
    body: JSON.stringify({
      title: draft.title,
      group: connection.group,
      customer: connection.customer,
      article: {
        subject: draft.title,
        body: operationId === undefined ? draft.body : `${draft.body}\n\n[relution-operation:${operationId}]`,
        type: "note",
        internal: true,
        content_type: "text/plain",
      },
    }),
  }, transportOptions);
  return parseZammadTicketResult(await strictResponseJson(response, "Zammad ticket creation"), connection, "Zammad ticket creation");
}

function isAuthenticatedZammadUser(raw: Record<string, unknown> | undefined): boolean {
  return raw !== undefined
    && typeof raw.id === "number"
    && Number.isSafeInteger(raw.id)
    && raw.id > 0
    && typeof raw.login === "string"
    && raw.login.trim().length > 0;
}
