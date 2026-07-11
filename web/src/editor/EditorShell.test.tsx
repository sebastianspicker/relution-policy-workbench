import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorShell } from "./EditorShell.js";
import { createAppState, createEditorControllerStub, installFetchMock } from "./useEditorController.test-helpers.js";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("EditorShell", () => {
  it("labels policy creation controls", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /new policy/i }));

    expect(screen.getByLabelText(/new policy name/i)).toBeTruthy();
    expect(screen.getByLabelText(/new policy platform/i)).toBeTruthy();
  });

  it("compact pane controls keep exactly one workspace pane active", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    const navigation = screen.getByRole("button", { name: /navigation/i });
    const inspector = document.querySelector('[aria-controls="editor-inspector-pane"]') as HTMLButtonElement;

    const editor = screen.getByRole("button", { name: "Editor" });
    expect(editor.getAttribute("aria-pressed")).toBe("true");
    expect(navigation.getAttribute("aria-pressed")).toBe("false");
    expect(inspector.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(navigation);
    expect(document.querySelector(".workspace-grid")?.classList.contains("compact-pane-navigation")).toBe(true);
    fireEvent.click(inspector);

    expect(navigation.getAttribute("aria-pressed")).toBe("false");
    expect(inspector.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".workspace-grid")?.classList.contains("compact-pane-inspector")).toBe(true);
  });

  it("responsive section switcher keeps primary work areas reachable", async () => {
    installFetchMock();
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    const sections: readonly { readonly label: string; readonly heading: RegExp }[] = [
      { label: "Policies", heading: /select a policy to start editing/i },
      { label: "Baselines", heading: /baseline builder/i },
      { label: "Device audit", heading: /device audit/i },
      { label: "Settings", heading: /settings/i },
    ];

    for (const section of sections) {
      const sectionButtons = screen.getAllByRole("button", { name: section.label });

      fireEvent.click(sectionButtons[0]!);

      expect(sectionButtons.some((button) => button.getAttribute("aria-current") === "page")).toBe(true);
      expect(await screen.findByRole("heading", { name: section.heading })).toBeTruthy();
    }
  });

  it("renders the baseline builder as a primary app section inside Baselines", async () => {
    installFetchMock();
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /baselines/i })[0]!);

    expect(await screen.findByRole("heading", { name: /baseline builder/i })).toBeTruthy();
    expect(await screen.findByRole("radio", { name: /tier 3/i })).toBeTruthy();
    expect(screen.getByText(/classroom devices/i)).toBeTruthy();
  });

  it("renders expert wizard settings with tier coverage", async () => {
    installFetchMock();
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /baselines/i })[0]!);
    fireEvent.click(await screen.findByRole("tab", { name: /expert/i }));

    expect(await screen.findByText(/selected baseline coverage/i)).toBeTruthy();
    expect(await screen.findByText(/current workspace compliance/i)).toBeTruthy();
    expect((await screen.findAllByText(/NATIVE_SINGLE/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BSI bsi-ios-passcode/i).length).toBeGreaterThan(0);
  });

  it("shows settings panel with key and import inputs when settings section is selected", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /settings/i })[0]!);

    expect(screen.getByLabelText(/encryption key/i)).toBeTruthy();
    expect(screen.getByLabelText(/relution \.rexp file/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /no policy version selected/i })).toBeNull();
  });

  it("renders the Relution dashboard as a primary app section", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /device audit/i })[0]!);

    expect(screen.getByRole("heading", { name: /device audit/i })).toBeTruthy();
    expect(screen.getByText(/no relution api session configured/i)).toBeTruthy();
  });

  it("does not show selected-setting JSON import before a configuration is selected", () => {
    const state = createAppState();
    const policy = state.workspace.policies[0]!;
    render(
      <EditorShell
        controller={createEditorControllerStub({
          state,
          policy,
          selection: { policyIndex: 0, versionIndex: 0 },
          configuration: undefined,
        })}
        theme="default"
        onThemeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /configurations/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /add configuration/i })).toBeTruthy();
    expect(screen.queryByLabelText(/selected setting json file/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /apply json/i })).toBeNull();
  });

  it("syncs direct hash navigation and canonicalizes an unknown route", async () => {
    window.history.replaceState(null, "", "/#/baselines/recommendations");
    render(<EditorShell controller={createEditorControllerStub()} theme="default" onThemeChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Recommendations" }).getAttribute("aria-selected")).toBe("true");

    window.history.replaceState(null, "", "/#/unknown");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(window.location.hash).toBe("#/policies");
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Policies" }).some((button) => button.getAttribute("aria-current") === "page")).toBe(true);
    });
  });

  it("maps primary undo and redo keyboard shortcuts to the correct controller actions", () => {
    const controller = createEditorControllerStub();
    render(<EditorShell controller={controller} theme="default" onThemeChange={vi.fn()} />);

    fireEvent.keyDown(document, { key: "z", metaKey: true });
    fireEvent.keyDown(document, { key: "z", metaKey: true, shiftKey: true });
    fireEvent.keyDown(document, { key: "y", ctrlKey: true });

    expect(controller.undoWorkspace).toHaveBeenCalledTimes(1);
    expect(controller.redoWorkspace).toHaveBeenCalledTimes(2);
  });

  it("preserves native undo, redo, and formatting shortcuts inside editable controls", () => {
    const controller = createEditorControllerStub();
    render(<EditorShell controller={controller} theme="default" onThemeChange={vi.fn()} />);
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
    render(<EditorShell controller={controller} theme="default" onThemeChange={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText(/search policies/i), { key: "s", ctrlKey: true });
    expect(controller.saveWorkspace).toHaveBeenCalledOnce();
  });
});
