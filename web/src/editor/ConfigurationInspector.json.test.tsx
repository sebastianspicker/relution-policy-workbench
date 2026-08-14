/** Verifies inspector raw-JSON behavior. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfigurationInspector } from "./ConfigurationInspector.js";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";

describe("ConfigurationInspector", () => {
  it("exposes inspector tabs and raw JSON to assistive technology", () => {
    const controller = createEditorControllerStub({
      inspectorTab: "json",
      setInspectorTab: vi.fn(),
      status: "Saved workspace",
      isDirty: false,
      rulesetReport: undefined,
      details: { type: "NATIVE_SINGLE" },
      configuration: { uuid: "CONF-1" },
      rawJson: "{\n  \"uuid\": \"CONF-1\"\n}",
      rawJsonDirty: false,
      setRawJson: vi.fn(),
      resetRawJson: vi.fn(),
      applyRawJson: vi.fn(),
    });

    render(<ConfigurationInspector controller={controller} />);

    const rawJsonTab = screen.getByRole("tab", { name: /^json$/i });
    expect(rawJsonTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(rawJsonTab.id);
    expect(screen.getByLabelText(/configuration raw json/i)).toBeTruthy();
  });

  it("disables raw JSON apply when no configuration is selected", () => {
    const controller = createEditorControllerStub({
      inspectorTab: "json",
      setInspectorTab: vi.fn(),
      status: "",
      isDirty: false,
      rulesetReport: undefined,
      details: undefined,
      configuration: undefined,
      rawJson: "{}",
      rawJsonDirty: false,
      setRawJson: vi.fn(),
      resetRawJson: vi.fn(),
      applyRawJson: vi.fn(),
    });

    render(<ConfigurationInspector controller={controller} />);

    expect((screen.getByRole("button", { name: /apply json/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a reset control and dirty warning when raw JSON diverges", () => {
    const controller = createEditorControllerStub({
      inspectorTab: "json",
      setInspectorTab: vi.fn(),
      status: "",
      isDirty: false,
      rulesetReport: undefined,
      details: { type: "NATIVE_SINGLE" },
      configuration: { uuid: "CONF-1" },
      rawJson: "{\n  \"draft\": true\n}",
      rawJsonDirty: true,
      setRawJson: vi.fn(),
      resetRawJson: vi.fn(),
      applyRawJson: vi.fn(),
    });

    render(<ConfigurationInspector controller={controller} />);

    expect(screen.getByText(/raw json draft differs from the live configuration/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /reset json/i }));

    expect(controller.resetRawJson).toHaveBeenCalledTimes(1);
  });
});
