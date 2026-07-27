/** Focused useEditorController workspace request intent request-intent scenarios. */
import { act, afterEach, createAppState, currentReady, deferEndpoint, describe, expect, it, renderSelectedController, resolveControllerAction, startControllerAction, updateConfigurationName, vi } from "./useEditorController.test-harness.js";
import { lastBodyFor } from "./useEditorController.request-intent-test-helpers.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController workspace request intent", () => {
it("posts the current dirty workspace when saving", async () => {
    const { requests, result } = await renderSelectedController();
    await updateConfigurationName(result, "Saved request body proof");
    await act(async () => {
      await currentReady(result).controller.saveWorkspace();
    });

    const body = lastBodyFor(requests, "/api/workspace");
    expect(JSON.stringify(body.workspace)).toContain("Saved request body proof");
    expect(currentReady(result).controller.status).toBe("Saved workspace");
  });

  it("keeps newer local edits dirty when a save response arrives late", async () => {
    const state = createAppState();
    const { result } = await renderSelectedController(state);
    await updateConfigurationName(result, "Edit A");
    const response = deferEndpoint("/api/workspace");

    const saving = await startControllerAction(() => currentReady(result).controller.saveWorkspace());
    await updateConfigurationName(result, "Edit B");
    await resolveControllerAction(saving, response, { workspace: state.workspace, validation: state.validation });

    expect(currentReady(result).controller.details?.name).toBe("Edit B");
    expect(currentReady(result).controller.isDirty).toBe(true);
    expect(currentReady(result).controller.canUndo).toBe(true);
  });
});
