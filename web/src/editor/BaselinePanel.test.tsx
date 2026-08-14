/** Verifies baseline tab selection and controlled routing precedence. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BaselinePanel } from "./BaselinePanel.js";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";

describe("BaselinePanel", () => {
  it("selects tabs locally and reports the selected tab", () => {
    const onTabChange = vi.fn();
    render(<BaselinePanel controller={createEditorControllerStub()} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Recommendations" }));
    expect(screen.getByRole("tab", { name: "Recommendations" }).getAttribute("aria-selected")).toBe("true");
    expect(onTabChange).toHaveBeenCalledWith("recommendations");
  });

  it("uses activeTab as the controlled source of truth after clicks", () => {
    const onTabChange = vi.fn();
    render(<BaselinePanel controller={createEditorControllerStub()} activeTab="wizard" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Compliance" }));
    expect(onTabChange).toHaveBeenCalledWith("compliance");
    expect(screen.getByRole("tab", { name: "Builder" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Compliance" }).getAttribute("aria-selected")).toBe("false");
  });
});
