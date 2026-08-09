/** Verifies policy-workspace controls and editor-global keyboard behavior. */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorShell } from "./EditorShell.js";
import { createAppState, createEditorControllerStub } from "./useEditorController.test-helpers.js";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("EditorShell policy workspace", () => {
  it("labels policy creation controls", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /new policy/i }));
    expect(screen.getByLabelText(/new policy name/i)).toBeTruthy();
    expect(screen.getByLabelText(/new policy platform/i)).toBeTruthy();
  });

  it("compact pane controls keep exactly one workspace pane active", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    const navigation = screen.getByRole("button", { name: /navigation/i });
    const inspector = document.querySelector('[aria-controls="editor-inspector-pane"]') as HTMLButtonElement;
    expect(screen.getByRole("button", { name: "Editor" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(navigation);
    expect(document.querySelector(".policy-workspace-grid")?.classList.contains("compact-pane-navigation")).toBe(true);
    fireEvent.click(inspector);
    expect(navigation.getAttribute("aria-pressed")).toBe("false");
    expect(inspector.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".policy-workspace-grid")?.classList.contains("compact-pane-inspector")).toBe(true);
  });

  it("does not show selected-setting JSON import before a configuration is selected", () => {
    const state = createAppState();
    const policy = state.workspace.policies[0]!;
    render(<EditorShell controller={createEditorControllerStub({ state, policy, selection: { policyIndex: 0, versionIndex: 0 }, configuration: undefined })} theme="studio" onThemeChange={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /configurations/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /add configuration/i })).toBeTruthy();
    expect(screen.queryByLabelText(/selected setting json file/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /apply json/i })).toBeNull();
  });

  it("maps primary undo and redo keyboard shortcuts to the correct controller actions", () => {
    const controller = createEditorControllerStub();
    render(<EditorShell controller={controller} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.keyDown(document, { key: "z", metaKey: true });
    fireEvent.keyDown(document, { key: "z", metaKey: true, shiftKey: true });
    fireEvent.keyDown(document, { key: "y", ctrlKey: true });
    expect(controller.undoWorkspace).toHaveBeenCalledTimes(1);
    expect(controller.redoWorkspace).toHaveBeenCalledTimes(2);
  });

  it("preserves native undo, redo, and formatting shortcuts inside editable controls", () => {
    const controller = createEditorControllerStub();
    render(<EditorShell controller={controller} theme="studio" onThemeChange={vi.fn()} />);
    const input = screen.getByLabelText(/search policies/i);
    fireEvent.keyDown(input, { key: "z", metaKey: true });
    fireEvent.keyDown(input, { key: "y", ctrlKey: true });
    fireEvent.keyDown(input, { key: "b", ctrlKey: true });
    fireEvent.keyDown(input, { key: "i", ctrlKey: true });
    expect(controller.undoWorkspace).not.toHaveBeenCalled();
    expect(controller.redoWorkspace).not.toHaveBeenCalled();
    expect(controller.buildArchive).not.toHaveBeenCalled();
  });

  it("always allows the application save shortcut from an editable control", () => {
    const controller = createEditorControllerStub();
    render(<EditorShell controller={controller} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText(/search policies/i), { key: "s", ctrlKey: true });
    expect(controller.saveWorkspace).toHaveBeenCalledOnce();
  });

  it("toggles the pinned inspector through its toolbar control", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    const toggle = screen.getByRole("button", { name: /toggle inspector panel/i });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });
});
