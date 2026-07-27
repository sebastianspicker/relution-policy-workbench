/** Undo, redo, and clear-workspace controller history scenarios. */
import { controllerSuite, currentReady, expect, it, renderSelectedController, updateConfigurationName } from "./useEditorController.test-harness.js";
import { expectWorkspaceCleared, redoWorkspace, renderClearedWorkspace, undoWorkspace } from "./useEditorController.history-test-helpers.js";

controllerSuite("useEditorController history", () => {
  it("supports redo after undoing a local workspace edit", async () => {
    const { result } = await renderSelectedController();
    await updateConfigurationName(result, "Redo name");

    expect(currentReady(result).controller.canUndo).toBe(true);
    expect(currentReady(result).controller.canRedo).toBe(false);
    await undoWorkspace(result);
    expect(currentReady(result).controller.details?.name).toBe("Original name");
    expect(currentReady(result).controller.canRedo).toBe(true);
    await redoWorkspace(result);
    expect(currentReady(result).controller.details?.name).toBe("Redo name");
    expect(currentReady(result).controller.canUndo).toBe(true);
  });

  it("clears the workspace with undo and redo support", async () => {
    const result = await renderClearedWorkspace();
    expectWorkspaceCleared(result);
    await undoWorkspace(result);
    expect(currentReady(result).controller.state.workspace.policies.length).toBe(1);
    await redoWorkspace(result);
    expect(currentReady(result).controller.state.workspace.policies.length).toBe(0);
  });
});
