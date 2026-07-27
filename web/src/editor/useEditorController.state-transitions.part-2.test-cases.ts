/** Blocked sidecar and failed live-validation controller transitions. */
import { controllerSuite, createAppState, currentReady, expect, it, renderSelectedController, updateConfigurationName, waitFor } from "./useEditorController.test-harness.js";
import { renderDdmArtifactRemoval } from "./useEditorController.state-transition-test-fixtures.js";

controllerSuite("useEditorController state transitions", () => {
  it("keeps sidecar state and reports a blocked status when artifact removal returns no sidecar", async () => {
    const { result } = await renderDdmArtifactRemoval(() => ({ error: "cannot remove artifact" }));

    expect(currentReady(result).controller.state.sidecar.ddmArtifacts).toHaveLength(1);
    expect(currentReady(result).controller.status).toBe('Removed DDM artifact blocked: {"error":"cannot remove artifact"}');
  });

  it("replaces stale successful validation when live validation fails", async () => {
    const state = createAppState();
    state.validation = { ok: true, errors: [] };
    const { result } = await renderSelectedController(state, { workspaceValidateError: new Error("network down") });
    await updateConfigurationName(result, "Needs live validation");

    await waitFor(() => { expect(currentReady(result).controller.status).toBe("Live validation failed: network down"); });
    expect(currentReady(result).controller.state.validation).toEqual({
      ok: false,
      errors: [{ path: "workspace", message: "network down" }],
    });
  });
});
