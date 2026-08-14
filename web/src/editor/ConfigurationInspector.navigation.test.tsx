/** Verifies inspector tab navigation. */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState, type JSX } from "react";
import { describe, expect, it } from "vitest";
import { ConfigurationInspector } from "./ConfigurationInspector.js";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";
import type { InspectorTab } from "./types.js";

describe("ConfigurationInspector", () => {
  it("switches inspector panels from tab interactions against the current controller state", () => {
    function Harness(): JSX.Element {
      const [inspectorTab, setInspectorTab] = useState<InspectorTab>("validation");
      const controller = createEditorControllerStub({
        inspectorTab,
        setInspectorTab: (next) => setInspectorTab(next),
        details: {
          type: "NATIVE_SINGLE",
          displayName: "Passcode policy",
          payloadContent: { payload: { requirePasscode: true } },
        },
        configuration: { uuid: "CONF-1", details: { requirePasscode: true } },
        rawJson: "{\n  \"uuid\": \"CONF-1\"\n}",
      });
      return <ConfigurationInspector controller={controller} />;
    }

    render(<Harness />);

    expect(screen.getByRole("heading", { name: /^Validation$/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /preview/i }));
    const previewPanel = screen.getByRole("tabpanel", { name: /preview/i });
    expect(within(previewPanel).getByRole("heading", { name: /^Preview$/i })).toBeTruthy();
    expect(within(previewPanel).getByText("Passcode policy")).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("tab", { name: /preview/i }), { key: "ArrowDown" });

    expect(screen.getByRole("tab", { name: /^json$/i }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByLabelText(/configuration raw json/i) as HTMLTextAreaElement).value).toContain("CONF-1");
  });
});
