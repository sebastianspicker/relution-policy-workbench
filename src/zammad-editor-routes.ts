/** Handles authenticated Zammad editor routes and connection state. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "./editor-json-body.js";
import { requireRuntimeConnection, sendJson } from "./editor-routes-utils.js";
import {
  publicZammadSession,
  testZammadConnection,
  type ZammadConnection,
} from "./zammad-api.js";
import { ZammadTicketOperations, zammadTicketOperationId } from "./zammad-ticket-operations.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { parseTicketDraft } from "./zammad-editor-input.js";
import { isEditorApiNamespace } from "./editor-api-namespaces.js";
import { parseAllowedZammadConnection } from "./zammad-editor-connection.js";

export interface ZammadEditorRuntime {
  connection?: ZammadConnection;
  ticketOperations?: ZammadTicketOperations;
}

export async function handleZammadApiRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: ZammadEditorRuntime,
  allowLocalServiceHosts = false,
  workspace?: string,
  transportOptions: HttpServiceTransportOptions = {},
): Promise<boolean> {
  if (!isEditorApiNamespace(url.pathname, "zammad")) {
    return false;
  }
  if (url.pathname === "/api/zammad/session" && request.method === "GET") {
    sendJson(response, 200, publicZammadSession(runtime.connection));
    return true;
  }
  if (url.pathname === "/api/zammad/session" && request.method === "POST") {
    runtime.connection = await parseAllowedZammadConnection(await readJsonBody(request), allowLocalServiceHosts, transportOptions);
    sendJson(response, 200, publicZammadSession(runtime.connection));
    return true;
  }
  if (url.pathname === "/api/zammad/test" && request.method === "POST") {
    sendJson(response, 200, await testZammadConnection(await requireOutboundConnection(runtime, allowLocalServiceHosts), transportOptions));
    return true;
  }
  if (url.pathname === "/api/zammad/tickets" && request.method === "POST") {
    const draft = parseTicketDraft(await readJsonBody(request));
    if (workspace === undefined) throw new Error("Zammad ticket creation requires an editor workspace");
    runtime.ticketOperations ??= new ZammadTicketOperations(workspace, transportOptions);
    const connection = await requireOutboundConnection(runtime, allowLocalServiceHosts);
    const operationId = zammadTicketOperationId(connection, draft);
    sendJson(response, 200, { ticket: await runtime.ticketOperations.create(connection, draft), draft, operationId });
    return true;
  }
  sendJson(response, 404, { error: `Unknown Zammad endpoint: ${request.method ?? "GET"} ${url.pathname}` });
  return true;
}

async function requireOutboundConnection(runtime: ZammadEditorRuntime, allowLocalServiceHosts: boolean): Promise<ZammadConnection> {
  const connection = requireRuntimeConnection(runtime, "Zammad");
  return connection.allowLocalServiceHosts === allowLocalServiceHosts ? connection : { ...connection, allowLocalServiceHosts };
}
