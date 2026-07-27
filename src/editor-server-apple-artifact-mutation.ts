/** Applies the common add, update, and remove API behavior for Apple artifacts. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { optionalRecord, requireString } from "./editor-api-request-input.js";
import { readJsonBody } from "./editor-json-body.js";
import { sendJson } from "./editor-routes-utils.js";
import type { EditorRequestContext } from "./editor-server-contract.js";
import type { ManagedAppleArtifactRoute } from "./editor-server-apple-artifact-contracts.js";

export async function handleManagedAppleArtifactApiRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
  route: ManagedAppleArtifactRoute,
): Promise<boolean> {
  const action = managedArtifactAction(url.pathname, route.basePath);
  if (request.method !== "POST" || action === undefined) return false;
  const body = await readJsonBody(request);
  const { options, appleSchema } = context;
  const sidecar = action === "add"
    ? route.add(context, body)
    : action === "update"
      ? route.update(options.workspace, appleSchema, requireString(body, "uuid"), optionalRecord(body, "values") ?? {}, appleSchema.source.revision)
      : route.remove(options.workspace, requireString(body, "uuid"), appleSchema.source.revision);
  sendJson(response, 200, { sidecar });
  return true;
}

function managedArtifactAction(pathname: string, basePath: string): "add" | "update" | "remove" | undefined {
  if (pathname === basePath) return "add";
  if (pathname === `${basePath}/update`) return "update";
  return pathname === `${basePath}/remove` ? "remove" : undefined;
}
