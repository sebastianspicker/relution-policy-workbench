// Supports the editor UI and its focused test scenarios.
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureRelution, configureZammad, configuredRelutionSession, configuredZammadSession, mockDashboardApi, renderDashboard } from "./RelutionDashboardPanel.test-fixtures.js";
import { auditResponseFor, campusIpadAuditResponse, deferred, jsonResponse } from "./RelutionDashboardPanel.response-fixtures.js";

afterEach(() => vi.restoreAllMocks());

describe("RelutionDashboardPanel", () => {
  it("does not restore an audit from the session being replaced", async () => {
    const oldAudit = deferred<Response>();
    let sessionRequests = 0;
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(`https://relution-${String(++sessionRequests)}.example.test`),
      "/api/relution/devices/audit": () => oldAudit.promise,
    });
    renderDashboard();
    await configureRelution("relution-1.example.test");
    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution-new.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "new-token" } });
    act(() => { fireEvent.click(screen.getByRole("button", { name: /run audit/i })); fireEvent.click(screen.getByRole("button", { name: /set session/i })); });
    await screen.findByText(/relution https:\/\/relution-2\.example\.test \| read-only/i);
    await act(async () => oldAudit.resolve(jsonResponse(auditResponseFor("Old tenant iPad", "old-assessment"))));
    await waitFor(() => expect(screen.queryByText(/working/i)).toBeNull());
    expect(screen.queryByText(/old tenant ipad/i)).toBeNull();
  });

  it("keeps loading until overlapping requests settle and ignores an older request error", async () => {
    const relutionSession = deferred<Response>();
    const zammadSession = deferred<Response>();
    mockDashboardApi({ "/api/relution/session": () => relutionSession.promise, "/api/zammad/session": () => zammadSession.promise });
    renderDashboard();
    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "relution-token" } });
    fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
    fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
    act(() => { fireEvent.click(screen.getByRole("button", { name: /set session/i })); fireEvent.click(screen.getByRole("button", { name: /set zammad/i })); });
    await screen.findByText(/working/i);
    await act(async () => zammadSession.resolve(configuredZammadSession()));
    await screen.findByText(/zammad https:\/\/zammad\.example\.test/i);
    expect(screen.getByText(/working/i)).toBeTruthy();
    await act(async () => relutionSession.reject(new Error("obsolete Relution failure")));
    await waitFor(() => expect(screen.queryByText(/working/i)).toBeNull());
    expect(screen.queryByText(/obsolete relution failure/i)).toBeNull();
  });

  it("clears the selected ticket when either configured service is replaced", async () => {
    let relutionSessions = 0;
    let zammadSessions = 0;
    mockDashboardApi({
      "/api/relution/session": () => configuredRelutionSession(`https://relution-${String(++relutionSessions)}.example.test`),
      "/api/relution/devices/audit": () => jsonResponse(campusIpadAuditResponse()),
      "/api/zammad/session": () => configuredZammadSession(`https://zammad-${String(++zammadSessions)}.example.test`),
    });
    renderDashboard();
    await configureRelution("relution-1.example.test");
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/campus ipad/i);
    await configureZammad("zammad-1.example.test");
    fireEvent.click(screen.getByRole("button", { name: /ticket: missing-policy/i }));
    await screen.findByText(/mdm non-compliance: campus ipad/i);
    fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad-new.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-new-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
    await screen.findByText(/zammad https:\/\/zammad-2\.example\.test/i);
    expect(screen.queryByText(/mdm non-compliance: campus ipad/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /ticket: missing-policy/i }));
    await screen.findByText(/mdm non-compliance: campus ipad/i);
    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution-new.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "relution-new-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    await screen.findByText(/relution https:\/\/relution-2\.example\.test \| read-only/i);
    expect(screen.queryByText(/mdm non-compliance: campus ipad/i)).toBeNull();
  });
});
