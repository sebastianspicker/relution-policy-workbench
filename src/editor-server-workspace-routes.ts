/** Handles workspace state and policy CRUD endpoints for the editor. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEditorSidecar, reconcileMobileConfigRestoreEntries, recordMobileConfigRestoreEntries } from "./sidecar.js";
import { sendJson } from "./editor-routes-utils.js";
import { captureSidecarState, rollbackPersistedEditorState } from "./editor-sidecar-rollback.js";
import { assertWorkspaceIntegrity } from "./workspace-integrity.js";
import { synchronizeWorkspaceExportReport } from "./workspace-export-report.js";
import { assertPersistableWorkspace, loadWorkspace, saveWorkspace, validateWorkspace, type PolicyWorkspace } from "./workspace.js";
import { parseWorkspaceBody } from "./editor-domain-request-input.js";
import { badRequest, HttpError } from "./editor-http-input.js";
import { readJsonBody } from "./editor-json-body.js";
import type { EditorRequestContext } from "./editor-server-contract.js";

const IMPORT_JSON_BODY_LIMIT_BYTES = 64 * 1024 * 1024;

export async function handleWorkspaceApiRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): Promise<boolean> {
  const { options, bundle, appleSchema } = context;
  if (url.pathname === "/api/workspace" && request.method === "POST") {
    const body = await readJsonBody(request, IMPORT_JSON_BODY_LIMIT_BYTES);
    let workspace: PolicyWorkspace;
    try {
      workspace = parseWorkspaceBody(body);
      assertPersistableWorkspace(workspace);
      synchronizeWorkspaceExportReport(workspace);
      assertWorkspaceIntegrity(workspace);
    } catch (error) {
      throw clientInputError(error);
    }
    const previousWorkspace = loadWorkspace(options.workspace);
    const previousSidecar = captureSidecarState(options.workspace);
    try {
      saveWorkspace(options.workspace, workspace);
      const persisted = loadWorkspace(options.workspace);
      const sidecar = recordMobileConfigRestoreEntries(options.workspace, persisted, appleSchema.source.revision);
      sendJson(response, 200, { workspace: persisted, validation: validateWorkspace(persisted, bundle), sidecar });
    } catch (error) {
      rollbackPersistedEditorState(options.workspace, previousWorkspace, previousSidecar, error);
      throw error;
    }
    return true;
  }
  if (url.pathname === "/api/workspace/validate" && request.method === "POST") {
    const body = await readJsonBody(request, IMPORT_JSON_BODY_LIMIT_BYTES);
    try {
      sendJson(response, 200, { validation: validateWorkspace(parseWorkspaceBody(body), bundle) });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }
  if (url.pathname === "/api/roundtrip/sidecar" && request.method === "GET") {
    sendJson(response, 200, loadEditorSidecar(options.workspace));
    return true;
  }
  if (url.pathname === "/api/roundtrip/reconcile" && request.method === "POST") {
    const workspace = reconcileMobileConfigRestoreEntries(loadWorkspace(options.workspace), loadEditorSidecar(options.workspace));
    saveWorkspace(options.workspace, workspace);
    sendJson(response, 200, { workspace, validation: validateWorkspace(workspace, bundle), sidecar: loadEditorSidecar(options.workspace) });
    return true;
  }
  return false;
}

function clientInputError(error: unknown): HttpError {
  return error instanceof HttpError ? error : badRequest(error instanceof Error ? error.message : String(error));
}
