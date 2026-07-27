/** Handles workspace mutations that create Apple profile configurations. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { optionalRecord, optionalString, requireNumber, requireString } from "./editor-api-request-input.js";
import { readJsonBody } from "./editor-json-body.js";
import { sendJson } from "./editor-routes-utils.js";
import type { EditorRequestContext } from "./editor-server-contract.js";
import { loadEditorSidecar } from "./sidecar.js";
import { addAppleSchemaProfileToWorkspace, addCustomSettingsToWorkspace, validateWorkspace, type PolicyWorkspace } from "./workspace.js";

export async function handleAppleProfileApiRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): Promise<boolean> {
  if (url.pathname === "/api/apple-profile/add" && request.method === "POST") {
    await addAppleSchemaProfile(url, request, response, context);
    return true;
  }
  if (url.pathname === "/api/custom-settings/add" && request.method === "POST") {
    await addCustomSettings(url, request, response, context);
    return true;
  }
  return false;
}

async function addAppleSchemaProfile(
  _url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  { options, bundle, appleSchema }: EditorRequestContext,
): Promise<void> {
  const body = await readJsonBody(request);
  const sidecar = loadEditorSidecar(options.workspace);
  const workspace = addAppleSchemaProfileToWorkspace(options.workspace, appleSchema, {
    policyPath: requireString(body, "policyPath"),
    versionIndex: requireNumber(body, "versionIndex"),
    schemaId: requireString(body, "schemaId"),
  });
  sendJson(response, 200, { workspace, validation: validateWorkspace(workspace, bundle), sidecar });
}

async function addCustomSettings(
  _url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  { options, bundle }: EditorRequestContext,
): Promise<void> {
  const body = await readJsonBody(request);
  const sidecar = loadEditorSidecar(options.workspace);
  const workspace = addCustomSettingsFromBody(options.workspace, body);
  sendJson(response, 200, { workspace, validation: validateWorkspace(workspace, bundle), sidecar });
}

function addCustomSettingsFromBody(workspacePath: string, body: Record<string, unknown>): PolicyWorkspace {
  const options: Parameters<typeof addCustomSettingsToWorkspace>[1] = {
    policyPath: requireString(body, "policyPath"),
    versionIndex: requireNumber(body, "versionIndex"),
    domain: optionalString(body, "domain") ?? "com.example.app",
    settings: optionalRecord(body, "settings") ?? {},
  };
  const displayName = optionalString(body, "displayName");
  if (displayName !== undefined) options.displayName = displayName;
  return addCustomSettingsToWorkspace(workspacePath, options);
}
