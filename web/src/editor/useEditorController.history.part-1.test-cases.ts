/** Before-unload scenarios for controller history state. */
import { controllerSuite, expect, it } from "./useEditorController.test-harness.js";
import { dispatchBeforeUnload, renderDirtySelectedConfiguration, undoWorkspace } from "./useEditorController.history-test-helpers.js";

controllerSuite("useEditorController history", () => {
  it("sets beforeunload returnValue when the workspace is dirty", async () => {
    await renderDirtySelectedConfiguration("Dirty name");

    expect(dispatchBeforeUnload().returnValue).toBe("");
  });

  it("clears the dirty beforeunload warning after undo restores a clean workspace", async () => {
    const result = await renderDirtySelectedConfiguration("Dirty name");
    await undoWorkspace(result);

    expect(dispatchBeforeUnload().returnValue).toBeUndefined();
  });
});
