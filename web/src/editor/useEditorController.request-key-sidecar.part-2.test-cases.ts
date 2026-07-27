/** Focused useEditorController key and sidecar request intent request-intent scenarios. */
import { act, afterEach, createAppState, currentReady, deferEndpoint, deferred, describe, expect, it, jsonResponse, renderDdmArtifactController, requestPath, resolveControllerAction, startControllerAction, updateConfigurationName, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController key and sidecar request intent", () => {

  it("merges a late sidecar mutation after a newer workspace edit", async () => {
    const state = createAppState();
    const { result } = await renderDdmArtifactController(state);
    const sidecarResponse = deferEndpoint("/api/ddm/artifact");
    const addingArtifact = await startControllerAction(() => currentReady(result).controller.addDdmArtifact());
    await updateConfigurationName(result, "Edit after sidecar mutation");
    await resolveControllerAction(addingArtifact, sidecarResponse, {
      sidecar: { ...state.sidecar, ddmArtifacts: [{ uuid: "artifact-1" }] },
    });

    expect(currentReady(result).controller.details?.name).toBe("Edit after sidecar mutation");
    expect(currentReady(result).controller.isDirty).toBe(true);
    expect(currentReady(result).controller.state.sidecar.ddmArtifacts).toEqual([{ uuid: "artifact-1" }]);
  });

  it("keeps a sidecar mutation single-flight so an earlier server success remains authoritative", async () => {
    const state = createAppState();
    const { result } = await renderDdmArtifactController(state);

    const firstResponse = deferred<Response>();
    let mutationRequests = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/ddm/artifact");
      mutationRequests += 1;
      if (mutationRequests === 1) return await firstResponse.promise;
      return jsonResponse({ error: "overlapping mutation should not be sent" }, 500);
    });

    let firstMutation!: Promise<void>;
    await act(async () => { firstMutation = currentReady(result).controller.addDdmArtifact(); });
    await act(async () => { await currentReady(result).controller.addDdmArtifact(); });

    expect(mutationRequests).toBe(1);
    expect(currentReady(result).controller.status).toContain("sidecar mutation");
    firstResponse.resolve(jsonResponse({
      sidecar: { ...state.sidecar, ddmArtifacts: [{ uuid: "authoritative-artifact" }] },
    }));
    await act(async () => { await firstMutation; });

    expect(currentReady(result).controller.state.sidecar.ddmArtifacts).toEqual([{ uuid: "authoritative-artifact" }]);
  });
});
