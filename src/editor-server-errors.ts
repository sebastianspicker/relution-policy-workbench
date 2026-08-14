/** Converts route failures into one safe editor HTTP response. */
import type { ServerResponse } from "node:http";
import { SidecarInputError } from "./sidecar.js";
import { HttpError } from "./editor-http-input.js";
import { isEditorMutationCancellation } from "./editor-mutation-routing.js";
import { sendJson } from "./editor-routes-utils.js";
import { WorkspaceInputError } from "./workspace.js";

interface EditorServerErrorDescriptor {
  readonly status: number;
  readonly message: string;
}

function describeEditorServerError(error: unknown): EditorServerErrorDescriptor {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      message: error.expose || error.status < 500 ? error.message : "Internal editor error",
    };
  }
  if (error instanceof WorkspaceInputError || error instanceof SidecarInputError) {
    return { status: 400, message: error.message };
  }
  return { status: 500, message: "Internal editor error" };
}

export function handleEditorServerError(response: ServerResponse, error: unknown): void {
  if (isEditorMutationCancellation(error)) return;
  const descriptor = describeEditorServerError(error);
  if (descriptor.status >= 500) console.error(error);
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) {
    response.destroy();
    return;
  }
  sendJson(response, descriptor.status, { error: descriptor.message });
}
