/** Verifies compliance findings expose exact remediation controls and accessible inspection details. */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompliancePanel } from "./CompliancePanel.js";
import { createEditorControllerStub } from "./useEditorController.test-helpers.js";
import {
  createCompliancePanelPolicy,
  createDegradedComplianceReport,
  createExactGapComplianceReport,
  createUnavailableVendorRemediationReport,
} from "./useEditorController.test-recommendation-fixtures.js";

describe("ConfigurationInspector compliance", () => {
  it("renders the compliance viewer and exact remediation action", () => {
    const controller = createEditorControllerStub({
      policy: createCompliancePanelPolicy(),
      complianceSources: ["bsi", "vendor", "cis"],
      complianceReport: createExactGapComplianceReport(),
      complianceLoading: false,
      complianceError: undefined,
      applyComplianceRemediation: vi.fn(async () => {}),
    });

    render(<CompliancePanel controller={controller} />);

    expect(screen.getByRole("heading", { name: /compliance/i })).toBeTruthy();
    expect(screen.getByText(/test policy \| ios/i)).toBeTruthy();
    const sourceGroup = screen.getByRole("group", { name: /compliance sources/i });
    expect(within(sourceGroup).getByRole("button", { name: /^BSI$/i }).getAttribute("aria-pressed")).toBe("true");
    expect(within(sourceGroup).queryByRole("button", { name: /refresh/i })).toBeNull();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /use a strong passcode/i }));
    expect(screen.getByRole("button", { name: /apply ios_passcode exact bundle/i })).toBeTruthy();
    expect(screen.getByText(/terminal fallback/i)).toBeTruthy();
    expect(screen.getByText(/profiles show -type configuration/i)).toBeTruthy();
    expect(screen.getByText(/run a terminal profile check/i)).toBeTruthy();

    fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: "not present" } });
    expect(screen.getByText(/no compliance results match the current filters/i)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: "" } });
    expect(screen.getByRole("button", { name: /use a strong passcode/i })).toBeTruthy();
  });

  it("renders degraded compliance source warnings", () => {
    const controller = createEditorControllerStub({
      policy: createCompliancePanelPolicy(),
      complianceSources: ["bsi"],
      complianceReport: createDegradedComplianceReport(),
      complianceLoading: false,
      complianceError: undefined,
      toggleComplianceSource: vi.fn(),
      refreshCompliance: vi.fn(async () => {}),
    });

    render(<CompliancePanel controller={controller} />);

    expect(screen.getByText(/bsi setting-bundle catalog unavailable: missing settings catalog fixture/i)).toBeTruthy();
  });

  it("disables unavailable compliance remediation actions", () => {
    const applyComplianceRemediation = vi.fn(async () => {});
    const controller = createEditorControllerStub({
      policy: createCompliancePanelPolicy(),
      complianceSources: ["vendor"],
      complianceReport: createUnavailableVendorRemediationReport(),
      complianceLoading: false,
      complianceError: undefined,
      toggleComplianceSource: vi.fn(),
      refreshCompliance: vi.fn(async () => {}),
      applyComplianceRemediation,
    });

    render(<CompliancePanel controller={controller} />);

    fireEvent.click(screen.getByRole("button", { name: /disable unmanaged service/i }));
    const applyButton = screen.getByRole("button", { name: /apply exact mapping for disable unmanaged service/i }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);
    expect(applyButton.title).toContain("Setting bundle catalog failed to load");
    fireEvent.click(applyButton);
    expect(applyComplianceRemediation).not.toHaveBeenCalled();
  });

  it("disables the final active compliance source instead of silently ignoring it", () => {
    const controller = createEditorControllerStub({
      inspectorTab: "validation",
      setInspectorTab: vi.fn(),
      status: "",
      isDirty: false,
      rulesetReport: undefined,
      policy: {
        path: "policies/policy_test.json",
        document: {
          name: "Test Policy",
          platform: "IOS",
        },
      },
      complianceSources: ["bsi"],
      complianceReport: undefined,
      complianceLoading: false,
      complianceError: undefined,
      toggleComplianceSource: vi.fn(),
      refreshCompliance: vi.fn(async () => {}),
    });

    render(<CompliancePanel controller={controller} />);

    const bsiButton = within(screen.getByRole("group", { name: /compliance sources/i })).getByRole("button", { name: /^BSI$/i }) as HTMLButtonElement;
    expect(bsiButton.disabled).toBe(true);
    expect(bsiButton.getAttribute("aria-pressed")).toBe("true");
    expect(bsiButton.title).toMatch(/at least one compliance source/i);
  });

  it("clears a selected result locally when filters hide it", () => {
    const controller = createEditorControllerStub({
      policy: createCompliancePanelPolicy(),
      complianceReport: createExactGapComplianceReport(),
    });

    render(<CompliancePanel controller={controller} />);

    fireEvent.click(screen.getByRole("button", { name: /use a strong passcode/i }));
    expect(screen.getByRole("heading", { name: /use a strong passcode/i })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: "not present" } });

    expect(screen.getByText(/no compliance results match the current filters/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^back$/i })).toBeNull();
  });

  it("presents no-policy and loading states without stale controls", () => {
    const { rerender } = render(<CompliancePanel controller={createEditorControllerStub()} />);

    expect(screen.getByText(/select a policy to compare it against the harvested recommendations/i)).toBeTruthy();
    expect(screen.queryByRole("searchbox", { name: /search/i })).toBeNull();

    rerender(<CompliancePanel controller={createEditorControllerStub({ policy: createCompliancePanelPolicy(), complianceLoading: true })} />);

    expect(screen.getByText(/checking compliance/i)).toBeTruthy();
    expect(screen.queryByRole("searchbox", { name: /search/i })).toBeNull();
  });

  it("forwards refresh and selected remediation actions to the controller", () => {
    const refreshCompliance = vi.fn(async () => {});
    const applyComplianceRemediation = vi.fn(async () => {});
    const controller = createEditorControllerStub({ policy: createCompliancePanelPolicy(), complianceReport: createExactGapComplianceReport(), refreshCompliance, applyComplianceRemediation });
    render(<CompliancePanel controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    fireEvent.click(screen.getByRole("button", { name: /use a strong passcode/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply ios_passcode exact bundle/i }));
    expect(refreshCompliance).toHaveBeenCalledOnce();
    expect(applyComplianceRemediation).toHaveBeenCalledWith("native-bundle:bsi-ios-passcode");
  });
});
