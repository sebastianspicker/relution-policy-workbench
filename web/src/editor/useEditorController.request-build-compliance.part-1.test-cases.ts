/** Focused useEditorController build and compliance request intent request-intent scenarios. */
import { act, controllerSuite, createAppState, createComplianceReport, currentReady, deferEndpoint, deferred, expect, it, jsonResponse, renderSelectedController, requestPath, resolveControllerAction, startControllerAction, updateConfigurationName, vi, waitFor } from "./useEditorController.test-harness.js";

controllerSuite("useEditorController build and compliance request intent", () => {
it("does not start an explicit compliance check during an exclusive workspace mutation", async () => {
    const state = createAppState();
    const { result, requests } = await renderSelectedController(state);
    await waitFor(() => {
      expect(requests.some((request) => request.url === "/api/compliance/check")).toBe(true);
    });

    const reconcileResponse = deferred<Response>();
    let explicitComplianceChecks = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const path = requestPath(input);
      if (path === "/api/roundtrip/reconcile") return await reconcileResponse.promise;
      if (path === "/api/compliance/check") {
        explicitComplianceChecks += 1;
        return jsonResponse({ report: createComplianceReport() });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });

    const reconciling = await startControllerAction(() => currentReady(result).controller.reconcileSidecar());
    await act(async () => { await currentReady(result).controller.refreshCompliance(); });

    expect(explicitComplianceChecks).toBe(0);
    expect(currentReady(result).controller.status).toContain("server workspace mutation");
    await resolveControllerAction(reconciling, reconcileResponse, { workspace: state.workspace, validation: state.validation, sidecar: state.sidecar });
  });

  it("does not mark an archive fresh when a build response follows a newer edit", async () => {
    const state = createAppState();
    const { result } = await renderSelectedController(state);
    const buildResponse = deferEndpoint("/api/build");
    const building = await startControllerAction(() => currentReady(result).controller.buildArchive());
    await updateConfigurationName(result, "Edit after build started");
    await resolveControllerAction(building, buildResponse, { outputFile: "stale.rexp", sidecar: state.sidecar, verification: { ok: true } });

    expect(currentReady(result).controller.details?.name).toBe("Edit after build started");
    expect(currentReady(result).controller.hasFreshBuild).toBe(false);
  });
});
