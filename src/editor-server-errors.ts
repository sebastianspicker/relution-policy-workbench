/** Converts route failures into one safe editor HTTP response. */
import type { ServerResponse } from "node:http";
import { SidecarInputError } from "./sidecar.js";
import { HttpError } from "./editor-http-input.js";
import { isEditorMutationCancellation } from "./editor-mutation-routing.js";
import { sendJson } from "./editor-routes-utils.js";
import { WorkspaceInputError } from "./workspace.js";

export function handleEditorServerError(response: ServerResponse, error: unknown): void {
  if (isEditorMutationCancellation(error)) return;
  const domainInputError = error instanceof WorkspaceInputError || error instanceof SidecarInputError;
  const status = error instanceof HttpError ? error.status : domainInputError ? 400 : 500;
  if (status >= 500) console.error(error);
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) {
    response.destroy();
    return;
  }
  sendJson(response, status, {
    error: error instanceof HttpError && error.expose
      ? error.message
      : domainInputError && error instanceof Error
        ? error.message
        : status >= 500
          ? "Internal editor error"
          : error instanceof Error ? error.message : String(error),
  });
}
