// Supports the editor UI and its focused test scenarios.
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureRelution, configureZammad, configuredRelutionSession, configuredZammadSession, mockDashboardApi, renderDashboard } from "./RelutionDashboardPanel.test-fixtures.js";
import { campusIpadAuditResponse, jsonResponse, requestJson } from "./RelutionDashboardPanel.response-fixtures.js";

afterEach(() => vi.restoreAllMocks());

describe("RelutionDashboardPanel", () => {
  it("omits empty audit filters from the request body", async () => {
    const auditBodies: unknown[] = [];
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(),
      "/api/relution/devices/audit": (init) => {
        auditBodies.push(requestJson(init));
        return jsonResponse(emptyAuditResponse());
      },
    });
    renderDashboard();
    await configureRelution();
    fireEvent.change(screen.getByLabelText(/platforms/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/statuses/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await waitFor(() => expect(auditBodies).toEqual([{ limit: 100 }]));
    expect(screen.queryByText(/compliance results are incomplete/i)).toBeNull();
  });

  it("rejects malformed expected-policy pairs before calling the audit endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => configuredRelutionSession());
    renderDashboard();
    await configureRelution();
    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "IOS Baseline" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/expected policies must use platform=policy a,policy b entries separated by semicolons/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not report a created Zammad ticket without an addressable identifier", async () => {
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(),
      "/api/relution/devices/audit": () => jsonResponse(campusIpadAuditResponse()),
      "/api/zammad/session": () => configuredZammadSession(),
      "/api/zammad/tickets": () => jsonResponse({ ticket: { raw: {} } }),
    });
    renderDashboard();
    await configureRelution();
    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "IOS=Baseline iOS" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/campus ipad/i);
    await configureZammad();
    fireEvent.click(screen.getByRole("button", { name: /ticket: missing-policy/i }));
    await screen.findByText(/MDM non-compliance: Campus iPad/i);
    fireEvent.click(screen.getByRole("button", { name: /review ticket destination/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm and create ticket/i }));
    await screen.findByText(/zammad ticket creation returned no ticket id or number/i);
    expect(screen.queryByText(/ticket created: unknown/i)).toBeNull();
  });
});

function emptyAuditResponse() {
  return {
    query: { baseUrl: "https://relution.example.test", count: 0, total: 0, truncated: false, devices: [] }, assessmentId: "assessment-empty",
    report: { generatedAt: "2026-04-26T10:00:00.000Z", baseUrl: "https://relution.example.test", completeness: { assessedCount: 0, total: 0, truncated: false, status: "complete" }, summary: { totalDevices: 0, compliant: 0, issue: 0, notCheckable: 0, missingPolicy: 0, inactiveWarning: 0, inactiveProblem: 0, byPlatform: {}, byStatus: {}, byPolicyStatus: {} }, devices: [] },
  };
}
