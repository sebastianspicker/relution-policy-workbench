/** Higher-level controller operations shared by request-ordering scenarios. */
import { act, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { currentReady } from "./useEditorController.test-core.js";
import { startConcurrentControllerActions } from "./useEditorController.test-deferred-requests.js";
import { renderSelectedController } from "./useEditorController.test-runner.js";
import type { AppState, EditorControllerResult } from "./types.js";

type ControllerResultRef = { current: EditorControllerResult };

export async function renderDdmArtifactController(state: AppState) {
  const hook = await renderSelectedController(state);
  await act(async () => { currentReady(hook.result).controller.setDdmSchemaId("com.example.ddm"); });
  await waitFor(() => { expect(currentReady(hook.result).controller.ddmSchemaId).toBe("com.example.ddm"); });
  return hook;
}

export async function renderArchiveImportController(state: AppState) {
  const hook = await renderSelectedController(state);
  await act(async () => {
    currentReady(hook.result).controller.setImportFile(new File(["archive"], "late.rexp", { type: "application/octet-stream" }));
  });
  return hook;
}

export async function startConcurrentComplianceChecks() {
  const hook = await renderSelectedController();
  const requests = await startConcurrentControllerActions(
    () => currentReady(hook.result).controller.refreshCompliance(),
    "/api/compliance/check",
  );
  return { ...hook, requests };
}

export function expectOriginalConfigurationClean(result: ControllerResultRef): void {
  expect(currentReady(result).controller.details?.name).toBe("Original name");
  expect(currentReady(result).controller.isDirty).toBe(false);
}
