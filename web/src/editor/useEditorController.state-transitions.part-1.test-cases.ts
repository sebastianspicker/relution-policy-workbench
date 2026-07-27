/** Successful clear and sidecar-removal controller transitions. */
import { controllerSuite, currentReady, expect, it } from "./useEditorController.test-harness.js";
import { expectWorkspaceCleared, renderClearedWorkspace } from "./useEditorController.history-test-helpers.js";
import { renderDdmArtifactRemoval } from "./useEditorController.state-transition-test-fixtures.js";

controllerSuite("useEditorController state transitions", () => {
  it("clears the workspace without consulting window confirmation", async () => {
    expectWorkspaceCleared(await renderClearedWorkspace());
  });

  it("removes a DDM artifact from controller sidecar state after a confirmed API response", async () => {
    const { result, requests } = await renderDdmArtifactRemoval((state) => ({
      sidecar: { ...state.sidecar, ddmArtifacts: [] },
    }));

    expect(currentReady(result).controller.state.sidecar.ddmArtifacts).toEqual([]);
    expect(currentReady(result).controller.status).toBe("Removed DDM artifact");
    expect(requests.find((request) => request.url === "/api/ddm/artifact/remove")?.body).toEqual({ uuid: "artifact-1" });
  });
});
