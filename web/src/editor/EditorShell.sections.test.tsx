/** Verifies route-owned editor sections and hash navigation. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorShell } from "./EditorShell.js";
import { createEditorControllerStub, installFetchMock } from "./useEditorController.test-helpers.js";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("EditorShell sections", () => {
  it("keeps primary work areas reachable from the responsive section switcher", async () => {
    installFetchMock();
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
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

  it("renders baseline builder and expert coverage within Baselines", async () => {
    installFetchMock();
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /baselines/i })[0]!);
    expect(await screen.findByRole("heading", { name: /baseline builder/i })).toBeTruthy();
    expect(await screen.findByRole("radio", { name: /tier 3/i })).toBeTruthy();
    expect(screen.getByText(/classroom devices/i)).toBeTruthy();
    fireEvent.click(await screen.findByRole("tab", { name: /expert/i }));
    expect(await screen.findByText(/selected baseline coverage/i)).toBeTruthy();
    expect(await screen.findByText(/current workspace compliance/i)).toBeTruthy();
    expect((await screen.findAllByText(/IOS_PASSCODE/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BSI bsi-ios-passcode/i).length).toBeGreaterThan(0);
  });

  it("shows settings key and import controls only in Settings", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /settings/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Encryption" }));
    expect(screen.getByLabelText(/archive passphrase/i)).toBeTruthy();
    expect(screen.getByLabelText(/relution \.rexp file/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /no policy version selected/i })).toBeNull();
    expect(document.querySelector(".section-workspace--settings")).toBeTruthy();
    expect(document.querySelector(".policy-workspace-grid")).toBeNull();
    expect(document.querySelector("#editor-navigation-pane")).toBeNull();
    expect(document.querySelector("#editor-inspector-pane")).toBeNull();
    expect(window.location.hash).toBe("#/settings");
  });

  it("renders the Relution dashboard without policy navigation", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /device audit/i })[0]!);
    expect(screen.getByRole("heading", { name: /device audit/i })).toBeTruthy();
    expect(screen.getByText(/no relution api session configured/i)).toBeTruthy();
    expect(document.querySelector(".section-workspace--device-audit")).toBeTruthy();
    expect(document.querySelector("#editor-navigation-pane")).toBeNull();
  });

  it("renders policy navigation and inspector only for the policies route", () => {
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    expect(document.querySelector(".policy-workspace-grid")).toBeTruthy();
    expect(document.querySelector("#editor-navigation-pane")).toBeTruthy();
    expect(document.querySelector("#editor-inspector-pane")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /baselines/i })[0]!);
    expect(document.querySelector(".section-workspace--baselines")).toBeTruthy();
    expect(document.querySelector("#editor-navigation-pane")).toBeNull();
    expect(document.querySelector("#editor-inspector-pane")).toBeNull();
    expect(screen.queryByRole("button", { name: /toggle inspector panel/i })).toBeNull();
  });

  it("syncs direct hash navigation and canonicalizes an unknown route", async () => {
    window.history.replaceState(null, "", "/#/baselines/recommendations");
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Recommendations" }).getAttribute("aria-selected")).toBe("true");
    window.history.replaceState(null, "", "/#/unknown");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(window.location.hash).toBe("#/policies");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Policies" }).some((button) => button.getAttribute("aria-current") === "page")).toBe(true));
  });

  it("translates Baselines tab changes into canonical baseline routes", async () => {
    installFetchMock();
    render(<EditorShell controller={createEditorControllerStub()} theme="studio" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /baselines/i })[0]!);
    fireEvent.click(await screen.findByRole("tab", { name: "Compliance" }));
    expect(window.location.hash).toBe("#/baselines/compliance");
    expect(screen.getByRole("tab", { name: "Compliance" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Builder" }));
    expect(window.location.hash).toBe("#/baselines/builder");
  });
});
