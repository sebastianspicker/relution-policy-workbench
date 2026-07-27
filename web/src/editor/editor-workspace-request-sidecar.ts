/** Serializes sidecar artifact mutations and exposes their request operations. */
import type { WorkspaceRequestGuard } from "./editor-workspace-request-guard.js";
import { beginSidecarMutation, finishSidecarMutation, isCurrentSidecarMutation } from "./editor-workspace-request-orthogonal.js";
import type { JsonRecord } from "./types.js";
import type { EditorControllerWorkspaceSetters } from "./useEditorControllerActionTypes.js";
import { parseArtifactValuesJson, postSidecarActionRequest } from "./useEditorControllerActionRequests.js";

interface SidecarRequesterInput {
  readonly guard: WorkspaceRequestGuard;
  readonly setState: EditorControllerWorkspaceSetters["setState"];
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
}

/** Serializes sidecar mutations because their generated artifacts share one server-side state. */
export function createSidecarRequester(input: SidecarRequesterInput) {
  async function postSidecarAction(url: string, body: JsonRecord, success: string): Promise<void> {
    const request = beginSidecarMutation(input.guard);
    if (request === undefined) {
      input.onError("A server sidecar mutation is already in progress");
      return;
    }
    try {
      const sidecar = await postSidecarActionRequest(url, body, success);
      if (!isCurrentSidecarMutation(input.guard, request)) return;
      input.setState((current) => current === undefined ? current : { ...current, sidecar });
      input.onSuccess(success);
    } catch (error) {
      if (!isCurrentSidecarMutation(input.guard, request)) return;
      input.onError(actionErrorMessage(error));
    } finally {
      finishSidecarMutation(input.guard, request);
    }
  }

  async function postArtifactUpdate(url: string, uuid: string, valuesJson: string, success: string): Promise<void> {
    try {
      await postSidecarAction(url, { uuid, values: parseArtifactValuesJson(valuesJson) }, success);
    } catch (error) {
      input.onError(actionErrorMessage(error));
    }
  }

  return { postSidecarAction, postArtifactUpdate };
}

function actionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
