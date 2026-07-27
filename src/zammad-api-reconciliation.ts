/** Reconciles uncertain Zammad ticket creation through bounded exact-marker lookups. */
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { strictResponseJson } from "./strict-response-json.js";
import type { ZammadConnection, ZammadTicketResult } from "./zammad-api-contract.js";
import { zammadFetch } from "./zammad-api-request.js";
import { parseZammadTicketResult } from "./zammad-api-ticket-result.js";
import { validOperationId } from "./zammad-operation-paths.js";
import { asRecord } from "./utils/json-guards.js";

const MAX_ZAMMAD_RECONCILIATION_RESULTS = 10;

/** Returns the sole ticket whose internal article has the exact operation-marker line. */
export async function findZammadTicketByOperationId(
  connection: ZammadConnection,
  operationId: string,
  transportOptions: HttpServiceTransportOptions = {},
): Promise<ZammadTicketResult | undefined> {
  if (!validOperationId(operationId)) throw new Error("Invalid Zammad operation id");
  const response = await zammadFetch(
    connection,
    "/api/v1/tickets/search",
    { method: "GET" },
    transportOptions,
    new URLSearchParams({ query: operationId, per_page: String(MAX_ZAMMAD_RECONCILIATION_RESULTS) }),
  );
  const rawValue = await strictResponseJson(response, "Zammad ticket search");
  if (!Array.isArray(rawValue) || rawValue.length > MAX_ZAMMAD_RECONCILIATION_RESULTS) {
    throw new Error("Zammad ticket search returned a non-array response");
  }
  const matches: ZammadTicketResult[] = [];
  for (const value of rawValue) {
    const candidate = parseSearchTicket(value, connection);
    if (candidate === undefined || candidate.id === undefined) continue;
    if (await zammadTicketHasExactOperationMarker(connection, candidate.id, operationId, transportOptions)) {
      matches.push(candidate);
      if (matches.length > 1) return undefined;
    }
  }
  return matches[0];
}

function parseSearchTicket(value: unknown, connection: ZammadConnection): ZammadTicketResult | undefined {
  try {
    return parseZammadTicketResult(value, connection, "Zammad ticket search");
  } catch {
    return undefined;
  }
}

async function zammadTicketHasExactOperationMarker(
  connection: ZammadConnection,
  ticketId: number,
  operationId: string,
  transportOptions: HttpServiceTransportOptions,
): Promise<boolean> {
  const response = await zammadFetch(
    connection,
    `/api/v1/ticket_articles/by_ticket/${String(ticketId)}`,
    { method: "GET" },
    transportOptions,
  );
  const rawValue = await strictResponseJson(response, "Zammad ticket article lookup");
  if (!Array.isArray(rawValue)) throw new Error("Zammad ticket article lookup returned a non-array response");
  const marker = `[relution-operation:${operationId}]`;
  return rawValue.some((value) => articleHasExactMarker(value, marker));
}

function articleHasExactMarker(value: unknown, marker: string): boolean {
  const article = asRecord(value);
  return article?.internal === true
    && typeof article.body === "string"
    && article.body.split(/\r?\n/u).some((line) => line === marker);
}
