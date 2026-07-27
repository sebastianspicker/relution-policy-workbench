/** Focused useEditorController build and compliance request intent request-intent scenarios. */
import { controllerSuite, createAppState, currentReady, deferEndpoint, deferTwoRequests, expect, expectOriginalConfigurationClean, it, renderArchiveImportController, renderController, resolveControllerAction, startControllerAction, updateConfigurationName } from "./useEditorController.test-harness.js";

controllerSuite("useEditorController build and compliance request intent", () => {

  it("does not restore build loading when an older build finishes last", async () => {
    const state = createAppState();
    const { result } = await renderController(state);
    const requests = deferTwoRequests("/api/build");
    const first = await startControllerAction(() => currentReady(result).controller.buildArchive());
    const second = await startControllerAction(() => currentReady(result).controller.buildArchive());
    await resolveControllerAction(second, requests.secondResponse, { outputFile: "new.rexp", sidecar: state.sidecar, verification: { ok: true } });
    expect(currentReady(result).controller.isBuildLoading).toBe(false);
    await resolveControllerAction(first, requests.firstResponse, { outputFile: "old.rexp", sidecar: state.sidecar, verification: { ok: true } });
    expect(currentReady(result).controller.isBuildLoading).toBe(false);
    expect(currentReady(result).controller.state.outputFile).toBe("new.rexp");
  });

  it("blocks local edits and applies the authoritative archive import", async () => {
    const state = createAppState();
    const { result } = await renderArchiveImportController(state);
    const importResponse = deferEndpoint("/api/import");
    const importing = await startControllerAction(() => currentReady(result).controller.importArchive());
    await updateConfigurationName(result, "Edit after import started");
    await resolveControllerAction(importing, importResponse, { workspace: state.workspace, validation: state.validation, keySet: false, sidecar: state.sidecar });

    expectOriginalConfigurationClean(result);
  });
});
