/** Verifies archive build and download actions. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";
import { WorkspaceToolbar } from "./WorkspaceToolbar.js";

const defaultProps = {
  inspectorPinned: false,
  onToggleInspector: vi.fn(),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WorkspaceToolbar", () => {
  it("keeps download unavailable until a fresh build exists", () => {
    render(<WorkspaceToolbar controller={createEditorControllerStub({ hasFreshBuild: false })} {...defaultProps} />);

    const downloadButton = screen.getByRole("button", { name: /download/i });

    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: /download/i })).toBeNull();
  });

  it("shows a download action after a fresh build exists", () => {
    render(<WorkspaceToolbar controller={createEditorControllerStub({ hasFreshBuild: true })} {...defaultProps} />);

    const downloadButton = screen.getByRole("button", { name: /download/i });

    expect((downloadButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("reports rejected downloads through visible editor status", async () => {
    const controller = createEditorControllerStub({ hasFreshBuild: true });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    render(<WorkspaceToolbar controller={controller} {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /download/i }));
    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => expect(controller.setStatus).toHaveBeenCalledTimes(2));
    expect(controller.setStatus).toHaveBeenLastCalledWith("Download failed: network down");
  });

  it("reports non-OK downloads through visible editor status", async () => {
    const controller = createEditorControllerStub({ hasFreshBuild: true });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("missing", { status: 404, statusText: "Not Found" }));
    render(<WorkspaceToolbar controller={controller} {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => expect(controller.setStatus).toHaveBeenCalledWith("Download failed: Failed to download output archive (404 Not Found)"));
  });

  it("build action starts archive creation and blocks duplicate clicks while running", () => {
    const controller = createEditorControllerStub({ isBuildLoading: false });
    const { rerender } = render(<WorkspaceToolbar controller={controller} {...defaultProps} />);

    const buildButton = screen.getByRole("button", { name: /build archive/i }) as HTMLButtonElement;

    expect(buildButton.disabled).toBe(false);
    fireEvent.click(buildButton);
    expect(controller.buildArchive).toHaveBeenCalledTimes(1);

    const loadingController = createEditorControllerStub({ isBuildLoading: true });
    rerender(<WorkspaceToolbar controller={loadingController} {...defaultProps} />);

    const loadingBuildButton = screen.getByRole("button", { name: /build archive/i }) as HTMLButtonElement;

    expect(loadingBuildButton.disabled).toBe(true);
    fireEvent.click(loadingBuildButton);
    expect(loadingController.buildArchive).not.toHaveBeenCalled();
  });
});
