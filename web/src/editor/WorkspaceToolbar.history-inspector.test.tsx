/** Verifies workspace history, save, and inspector controls. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";
import { WorkspaceToolbar } from "./WorkspaceToolbar.js";

const defaultProps = {
  inspectorPinned: false,
  onToggleInspector: vi.fn(),
};

describe("WorkspaceToolbar", () => {
  it("redo toolbar action only replays when an undone workspace change exists", () => {
    const unavailableController = createEditorControllerStub({ canRedo: false });
    const { rerender } = render(<WorkspaceToolbar controller={unavailableController} {...defaultProps} />);

    const unavailableRedoButton = screen.getByRole("button", { name: /redo/i }) as HTMLButtonElement;

    expect(unavailableRedoButton.disabled).toBe(true);
    fireEvent.click(unavailableRedoButton);
    expect(unavailableController.redoWorkspace).not.toHaveBeenCalled();

    const controller = createEditorControllerStub({ canRedo: true });
    rerender(<WorkspaceToolbar controller={controller} {...defaultProps} />);

    const redoButton = screen.getByRole("button", { name: /redo/i }) as HTMLButtonElement;

    expect(redoButton.disabled).toBe(false);
    fireEvent.click(redoButton);

    expect(controller.redoWorkspace).toHaveBeenCalledTimes(1);
  });

  it("dispatches available undo and save actions while guarding unavailable undo", () => {
    const unavailableController = createEditorControllerStub({ canUndo: false, isDirty: false });
    const { rerender } = render(<WorkspaceToolbar controller={unavailableController} {...defaultProps} />);

    const unavailableUndoButton = screen.getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(unavailableUndoButton.disabled).toBe(true);
    fireEvent.click(unavailableUndoButton);
    expect(unavailableController.undoWorkspace).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement).disabled).toBe(true);

    const controller = createEditorControllerStub({ canUndo: true, isDirty: true });
    rerender(<WorkspaceToolbar controller={controller} {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(controller.undoWorkspace).toHaveBeenCalledTimes(1);
    expect(controller.saveWorkspace).toHaveBeenCalledTimes(1);
  });

  it("omits unavailable inspector controls and exposes pinned inspector state", () => {
    const onToggleInspector = vi.fn();
    const controller = createEditorControllerStub();
    const { rerender } = render(
      <WorkspaceToolbar
        controller={controller}
        inspectorAvailable={false}
        inspectorPinned={false}
        onToggleInspector={onToggleInspector}
      />,
    );

    expect(screen.queryByRole("button", { name: /toggle inspector panel/i })).toBeNull();

    rerender(
      <WorkspaceToolbar
        controller={controller}
        inspectorAvailable
        inspectorPinned
        onToggleInspector={onToggleInspector}
      />,
    );
    const inspectorButton = screen.getByRole("button", { name: /toggle inspector panel/i });
    expect(inspectorButton.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(inspectorButton);
    expect(onToggleInspector).toHaveBeenCalledTimes(1);
  });
});
