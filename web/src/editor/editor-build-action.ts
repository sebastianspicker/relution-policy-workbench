/** Builds the archive while preserving request activity ownership. */
import { asRecord, isEditorSidecarState, postJson, readJsonResponse } from "./editor-utils.js";
import type { ImportBuildActionInput } from "./editor-import-build-actions.js";
import { errorMessage } from "./editor-ruleset-apply.js";
import type { JsonRecord } from "./types.js";

export async function buildArchive(input: ImportBuildActionInput): Promise<void> {
  if (!input.requestGuard.canEditWorkspace()) {
    input.setActionErrorStatus("A server workspace mutation is in progress");
    return;
  }
  const request = input.requestGuard.begin();
  const activity = input.requestGuard.beginBuildActivity(request);
  input.setIsBuildLoading(true);
  input.setHasFreshBuild(false);
  try {
    if (input.isDirty && await input.persistWorkspace(input.currentState.workspace, request) === undefined) return;
    const response = await postJson("/api/build", {});
    const result = await readJsonResponse<JsonRecord>(response);
    if (!input.requestGuard.isCurrent(request)) return;
    const verification = asRecord(result.verification);
    if (!response.ok || verification?.ok !== true) {
      input.setActionErrorStatus(verification !== undefined && verification.ok !== true ? "Build verification failed" : `Build blocked: ${JSON.stringify(result)}`);
      return;
    }
    input.setState((current) => current === undefined ? current : {
      ...current,
      outputFile: typeof result.outputFile === "string" ? result.outputFile : current.outputFile,
      sidecar: isEditorSidecarState(result.sidecar) ? result.sidecar : current.sidecar,
    });
    input.setHasFreshBuild(true);
    input.setActionSuccessStatus(`Built ${String(result.outputFile)}`);
  } catch (error) {
    if (input.requestGuard.isCurrent(request)) {
      const message = errorMessage(error);
      input.setLastActionResult({ ok: false, error: message });
      input.setStatus(`Build failed: ${message}`);
    }
  } finally {
    if (input.requestGuard.finishBuildActivity(activity)) input.setIsBuildLoading(false);
  }
}
