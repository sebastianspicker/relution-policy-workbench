/** Handles the individual authenticated Zammad editor operations. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "./editor-json-body.js";
import { requireRuntimeConnection, sendJson } from "./editor-routes-utils.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { publicZammadSession, testZammadConnection, type ZammadConnection } from "./zammad-api.js";
import { parseAllowedZammadConnection } from "./zammad-editor-connection.js";
import type { ZammadEditorRuntime } from "./zammad-editor-contract.js";
import { parseTicketDraft } from "./zammad-editor-input.js";
import { ZammadTicketOperations, zammadTicketOperationId } from "./zammad-ticket-operations.js";

export function handleZammadSessionGet(response: ServerResponse, runtime: ZammadEditorRuntime): void {
  sendJson(response, 200, publicZammadSession(runtime.connection));
}

export async function handleZammadSessionPost(
  request: IncomingMessage,
  response: ServerResponse,
  runtime: ZammadEditorRuntime,
  allowLocalServiceHosts: boolean,
  transportOptions: HttpServiceTransportOptions,
): Promise<void> {
  runtime.connection = await parseAllowedZammadConnection(await readJsonBody(request), allowLocalServiceHosts, transportOptions);
  sendJson(response, 200, publicZammadSession(runtime.connection));
}

export async function handleZammadTest(
  response: ServerResponse,
  runtime: ZammadEditorRuntime,
  allowLocalServiceHosts: boolean,
  transportOptions: HttpServiceTransportOptions,
): Promise<void> {
  sendJson(response, 200, await testZammadConnection(await requireOutboundConnection(runtime, allowLocalServiceHosts), transportOptions));
}

export async function handleZammadTickets(
  request: IncomingMessage,
  response: ServerResponse,
  runtime: ZammadEditorRuntime,
  allowLocalServiceHosts: boolean,
  workspace: string | undefined,
  transportOptions: HttpServiceTransportOptions,
): Promise<void> {
  const draft = parseTicketDraft(await readJsonBody(request));
  if (workspace === undefined) throw new Error("Zammad ticket creation requires an editor workspace");
  runtime.ticketOperations ??= new ZammadTicketOperations(workspace, transportOptions);
  const connection = await requireOutboundConnection(runtime, allowLocalServiceHosts);
  const operationId = zammadTicketOperationId(connection, draft);
  sendJson(response, 200, { ticket: await runtime.ticketOperations.create(connection, draft), draft, operationId });
}

async function requireOutboundConnection(runtime: ZammadEditorRuntime, allowLocalServiceHosts: boolean): Promise<ZammadConnection> {
  const connection = requireRuntimeConnection(runtime, "Zammad");
  return connection.allowLocalServiceHosts === allowLocalServiceHosts ? connection : { ...connection, allowLocalServiceHosts };
}
