/** Verifies workspace context and status controls. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";
import { WorkspaceToolbar } from "./WorkspaceToolbar.js";

const defaultProps = {
  inspectorPinned: false,
  onToggleInspector: vi.fn(),
};

describe("WorkspaceToolbar", () => {
  it("identifies the active workspace context", () => {
    render(<WorkspaceToolbar controller={createEditorControllerStub()} {...defaultProps} />);

    expect(screen.getByRole("navigation", { name: "Workspace context" })).toBeTruthy();
    expect(screen.getByText("Policies")).toBeTruthy();
  });

  it("does not contain a clear button (clear moved to Settings panel)", () => {
    render(<WorkspaceToolbar controller={createEditorControllerStub()} {...defaultProps} />);

    expect(screen.queryByRole("button", { name: /^clear/i })).toBeNull();
  });

  it("shows a dirty dot indicator when the workspace is unsaved", () => {
    render(<WorkspaceToolbar controller={createEditorControllerStub({ isDirty: true })} {...defaultProps} />);

    expect(screen.getByRole("status", { hidden: true })).toBeTruthy();
  });

  it("hides the dirty dot indicator when the workspace is saved", () => {
    render(<WorkspaceToolbar controller={createEditorControllerStub({ isDirty: false })} {...defaultProps} />);

    expect(screen.queryByRole("status", { hidden: true })).toBeNull();
  });
});
