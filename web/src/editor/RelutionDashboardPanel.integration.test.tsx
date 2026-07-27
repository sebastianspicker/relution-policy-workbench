/** Verifies dashboard requests, validation, and ticket output for external integrations. */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureRelution,
  configureZammad,
  configuredRelutionSession,
  configuredZammadSession,
  mockDashboardApi,
  renderDashboard,
} from "./RelutionDashboardPanel.test-fixtures.js";
import { campusIpadAuditResponse, jsonResponse, requestJson } from "./RelutionDashboardPanel.response-fixtures.js";

afterEach(() => vi.restoreAllMocks());

describe("RelutionDashboardPanel", () => {
  it("stores sessions, audits devices, writes a report, and creates a Zammad ticket", async () => {
    const auditBodies: unknown[] = [];
    const reportBodies: unknown[] = [];
    let ticketRequests = 0;
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(),
      "/api/relution/devices/audit": (init) => {
        auditBodies.push(requestJson(init));
        return jsonResponse({ ...campusIpadAuditResponse({ total: 2, truncated: true, inactiveDays: 95, inactiveProblem: 1 }), assessmentId: "assessment-1" });
      },
      "/api/relution/reports/compliance": (init) => {
        reportBodies.push(requestJson(init));
        return jsonResponse({ jsonPath: "reports/report.json", markdownPath: "reports/report.md" });
      },
      "/api/zammad/session": () => configuredZammadSession(),
      "/api/zammad/tickets": () => {
        ticketRequests += 1;
        return jsonResponse({ ticket: { id: 42, number: "240042", raw: {} } });
      },
    });

    renderDashboard();
    await configureRelution();
    expect(screen.queryByDisplayValue("secret-token")).toBeNull();
    fireEvent.change(screen.getByLabelText(/platforms/i), { target: { value: "IOS,ANDROID_ENTERPRISE" } });
    fireEvent.change(screen.getByLabelText(/statuses/i), { target: { value: "COMPLIANT,INACTIVE" } });
    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "IOS=Baseline iOS,Shared Baseline;ANDROID_ENTERPRISE=Android Baseline" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/campus ipad/i);
    await screen.findByText(/showing 1 of 2 enrolled devices; compliance results are incomplete/i);
    await screen.findByText(/missing policy 1/i);
    expect(auditBodies).toEqual([{ limit: 100, platforms: ["IOS", "ANDROID_ENTERPRISE"], statuses: ["COMPLIANT", "INACTIVE"], expectedPoliciesByPlatform: { IOS: ["Baseline iOS", "Shared Baseline"], ANDROID_ENTERPRISE: ["Android Baseline"] } }]);

    fireEvent.click(screen.getByRole("button", { name: /write report/i }));
    await waitFor(() => expect(screen.getByText(/report written: reports\/report\.md/i)).toBeTruthy());
    expect(reportBodies).toEqual([{ assessmentId: "assessment-1" }]);
    await configureZammad();
    fireEvent.click(screen.getByRole("button", { name: /ticket: missing-policy/i }));
    await screen.findByText(/MDM non-compliance: Campus iPad/i);
    fireEvent.click(screen.getByRole("button", { name: /review ticket destination/i }));
    expect(screen.getByText(/create one ticket in https:\/\/zammad\.example\.test, group it, for it@example\.test/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /confirm and create ticket/i }));
    await screen.findByText(/ticket created: 240042/i);
    expect(ticketRequests).toBe(1);
    expect((screen.getByRole("button", { name: /confirm and create ticket/i }) as HTMLButtonElement).disabled).toBe(true);
  }, 10_000);

  it("renders connection test failure signals from successful API responses", async () => {
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(),
      "/api/relution/test": () => jsonResponse({ ok: false, baseUrl: "https://relution.example.test", reason: "Relution connection test returned an unexpected device query response." }),
      "/api/zammad/session": () => configuredZammadSession(),
      "/api/zammad/test": () => jsonResponse({ ok: false, baseUrl: "https://zammad.example.test", reason: "Zammad connection test returned an unexpected current-user response." }),
    });

    renderDashboard();
    await configureRelution();
    fireEvent.click(screen.getByRole("button", { name: /^test$/i }));
    await screen.findByText(/unexpected device query response/i);
    await configureZammad();
    fireEvent.click(screen.getByRole("button", { name: /test zammad/i }));
    await screen.findByText(/unexpected current-user response/i);
  });

  it("rejects malformed audit filters before calling the audit endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => configuredRelutionSession());
    renderDashboard();
    await configureRelution();
    fireEvent.change(screen.getByLabelText(/platforms/i), { target: { value: "IOS,<script>" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/invalid relution platform: <script>/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

});
