/** Verifies that dashboard state keeps only current asynchronous operations. */
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureRelution,
  configureZammad,
  configuredRelutionSession,
  configuredZammadSession,
  mockDashboardApi,
  renderDashboard,
} from "./RelutionDashboardPanel.test-fixtures.js";
import { auditResponseFor, campusIpadAuditResponse, deferred, jsonResponse } from "./RelutionDashboardPanel.response-fixtures.js";

afterEach(() => vi.restoreAllMocks());

describe("RelutionDashboardPanel", () => {
  it("invalidates a pending ticket when a new draft is selected and closes its confirmation", async () => {
    const ticketResponse = deferred<Response>();
    const auditResponse = campusIpadAuditResponse();
    const issues = auditResponse.report.devices[0]!.issues as Array<{ id: string; severity: "warning" | "problem"; message: string; evidence: Record<string, string> }>;
    issues.push({ id: "inactive-warning", severity: "warning", message: "Device has not connected recently.", evidence: { inactiveDays: "65" } });
    let ticketRequests = 0;
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(),
      "/api/relution/devices/audit": () => jsonResponse(auditResponse),
      "/api/zammad/session": () => configuredZammadSession(),
      "/api/zammad/tickets": () => {
        ticketRequests += 1;
        return ticketResponse.promise;
      },
    });

    renderDashboard();
    await configureRelution();
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/campus ipad/i);
    await configureZammad();
    fireEvent.click(screen.getByRole("button", { name: /ticket: missing-policy/i }));
    fireEvent.click(screen.getByRole("button", { name: /review ticket destination/i }));
    await screen.findByRole("group", { name: /confirm zammad ticket creation/i });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /confirm and create ticket/i }));
      fireEvent.click(screen.getByRole("button", { name: /ticket: inactive-warning/i }));
    });

    expect(ticketRequests).toBe(1);
    await screen.findByText(/mdm inactive device: campus ipad/i);
    expect(screen.queryByRole("group", { name: /confirm zammad ticket creation/i })).toBeNull();
    expect((screen.getByRole("button", { name: /ticket: missing-policy/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /ticket: inactive-warning/i }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => ticketResponse.resolve(jsonResponse({ ticket: { id: 42, number: "240042", raw: {} } })));
    await waitFor(() => expect(screen.queryByText(/working/i)).toBeNull());
    expect(screen.queryByText(/ticket created: 240042/i)).toBeNull();
    expect((screen.getByRole("button", { name: /review ticket destination/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps the latest audit result when same-domain requests complete in reverse order", async () => {
    const firstAudit = deferred<Response>();
    const secondAudit = deferred<Response>();
    let auditRequests = 0;
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(),
      "/api/relution/devices/audit": () => {
        auditRequests += 1;
        return auditRequests === 1 ? firstAudit.promise : secondAudit.promise;
      },
    });

    renderDashboard();
    await configureRelution();
    const auditButton = screen.getByRole("button", { name: /run audit/i }) as HTMLButtonElement;
    act(() => {
      fireEvent.click(auditButton);
      fireEvent.click(auditButton);
    });
    expect(auditRequests).toBe(2);
    await screen.findByText(/working/i);
    expect((screen.getByLabelText(/platforms/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/statuses/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/expected policies/i) as HTMLInputElement).disabled).toBe(true);
    await act(async () => secondAudit.resolve(jsonResponse(auditResponseFor("Newest iPad", "assessment-new"))));
    await screen.findByText(/newest ipad/i);
    expect(screen.getByText(/audit completeness is unknown/i)).toBeTruthy();
    expect(screen.getByText(/working/i)).toBeTruthy();
    await act(async () => firstAudit.resolve(jsonResponse(auditResponseFor("Stale iPad", "assessment-old"))));
    await waitFor(() => expect(screen.queryByText(/working/i)).toBeNull());
    expect(screen.getByText(/newest ipad/i)).toBeTruthy();
    expect(screen.queryByText(/stale ipad/i)).toBeNull();
  });

});
