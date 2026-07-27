/** Focused useEditorController key and sidecar request intent request-intent scenarios. */
import { afterEach, createAppState, currentReady, deferEndpoint, describe, expectOriginalConfigurationClean, it, renderSelectedController, resolveControllerAction, startControllerAction, updateConfigurationName, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController key and sidecar request intent", () => {

  it("blocks local edits and applies the authoritative sidecar-reconcile response", async () => {
    const state = createAppState();
    const { result } = await renderSelectedController(state);
    const reconcileResponse = deferEndpoint("/api/roundtrip/reconcile");
    const reconciling = await startControllerAction(() => currentReady(result).controller.reconcileSidecar());
    await updateConfigurationName(result, "Edit after reconcile");
    await resolveControllerAction(reconciling, reconcileResponse, { workspace: state.workspace, validation: state.validation, sidecar: state.sidecar });

    expectOriginalConfigurationClean(result);
  });
});
