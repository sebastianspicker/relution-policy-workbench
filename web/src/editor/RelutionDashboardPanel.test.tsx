import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelutionDashboardPanel } from "./RelutionDashboardPanel.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelutionDashboardPanel", () => {
  it("stores sessions, audits devices, writes a report, and creates a Zammad ticket", async () => {
    const auditBodies: unknown[] = [];
    const reportBodies: unknown[] = [];
    let ticketRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      if (url === "/api/relution/devices/audit") {
        auditBodies.push(requestJson(init));
        return jsonResponse({
          ...campusIpadAuditResponse({ total: 2, truncated: true, inactiveDays: 95, inactiveProblem: 1 }),
          assessmentId: "assessment-1",
        });
      }
      if (url === "/api/relution/reports/compliance") {
        reportBodies.push(requestJson(init));
        return jsonResponse({ jsonPath: "reports/report.json", markdownPath: "reports/report.md" });
      }
      if (url === "/api/zammad/session") {
        return jsonResponse({ configured: true, baseUrl: "https://zammad.example.test", tokenConfigured: true, group: "IT", customer: "it@example.test" });
      }
      if (url === "/api/zammad/tickets") {
        ticketRequests += 1;
        return jsonResponse({ ticket: { id: 42, number: "240042", raw: {} } });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);

    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));

    await screen.findByText(/relution https:\/\/relution\.example\.test \| read-only/i);
    expect(screen.queryByDisplayValue("secret-token")).toBeNull();

    fireEvent.change(screen.getByLabelText(/platforms/i), { target: { value: "IOS,ANDROID_ENTERPRISE" } });
    fireEvent.change(screen.getByLabelText(/statuses/i), { target: { value: "COMPLIANT,INACTIVE" } });
    fireEvent.change(screen.getByLabelText(/expected policies/i), {
      target: { value: "IOS=Baseline iOS,Shared Baseline;ANDROID_ENTERPRISE=Android Baseline" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/campus ipad/i);
    await screen.findByText(/showing 1 of 2 enrolled devices; compliance results are incomplete/i);
    await screen.findByText(/missing policy 1/i);
    expect(auditBodies).toEqual([
      {
        limit: 100,
        platforms: ["IOS", "ANDROID_ENTERPRISE"],
        statuses: ["COMPLIANT", "INACTIVE"],
        expectedPoliciesByPlatform: {
          IOS: ["Baseline iOS", "Shared Baseline"],
          ANDROID_ENTERPRISE: ["Android Baseline"],
        },
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /write report/i }));
    await waitFor(() => expect(screen.getByText(/report written: reports\/report\.md/i)).toBeTruthy());
    expect(reportBodies).toEqual([{ assessmentId: "assessment-1" }]);

    fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
    fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
    await screen.findByText(/zammad https:\/\/zammad\.example\.test/i);

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
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      if (url === "/api/relution/test") {
        return jsonResponse({
          ok: false,
          baseUrl: "https://relution.example.test",
          reason: "Relution connection test returned an unexpected device query response.",
        });
      }
      if (url === "/api/zammad/session") {
        return jsonResponse({ configured: true, baseUrl: "https://zammad.example.test", tokenConfigured: true, group: "IT", customer: "it@example.test" });
      }
      if (url === "/api/zammad/test") {
        return jsonResponse({
          ok: false,
          baseUrl: "https://zammad.example.test",
          reason: "Zammad connection test returned an unexpected current-user response.",
        });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);

    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    await screen.findByText(/relution https:\/\/relution\.example\.test \| read-only/i);

    fireEvent.click(screen.getByRole("button", { name: /^test$/i }));
    await screen.findByText(/unexpected device query response/i);

    fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
    fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
    await screen.findByText(/zammad https:\/\/zammad\.example\.test/i);

    fireEvent.click(screen.getByRole("button", { name: /test zammad/i }));
    await screen.findByText(/unexpected current-user response/i);
  });

  it("rejects malformed audit filters before calling the audit endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);

    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    await screen.findByText(/relution https:\/\/relution\.example\.test \| read-only/i);

    fireEvent.change(screen.getByLabelText(/platforms/i), { target: { value: "IOS,<script>" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));

    await screen.findByText(/invalid relution platform: <script>/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("omits empty audit filters from the request body", async () => {
    const auditBodies: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      if (url === "/api/relution/devices/audit") {
        auditBodies.push(requestJson(init));
        return jsonResponse({
          query: { baseUrl: "https://relution.example.test", count: 0, total: 0, truncated: false, devices: [] },
          assessmentId: "assessment-empty",
          report: {
            generatedAt: "2026-04-26T10:00:00.000Z",
            baseUrl: "https://relution.example.test",
            completeness: { assessedCount: 0, total: 0, truncated: false, status: "complete" },
            summary: {
              totalDevices: 0,
              compliant: 0,
              issue: 0,
              notCheckable: 0,
              missingPolicy: 0,
              inactiveWarning: 0,
              inactiveProblem: 0,
              byPlatform: {},
              byStatus: {},
              byPolicyStatus: {},
            },
            devices: [],
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);

    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    await screen.findByText(/relution https:\/\/relution\.example\.test \| read-only/i);

    fireEvent.change(screen.getByLabelText(/platforms/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/statuses/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));

    await waitFor(() => expect(auditBodies).toEqual([{ limit: 100 }]));
    expect(screen.queryByText(/compliance results are incomplete/i)).toBeNull();
  });

  it("rejects malformed expected-policy pairs before calling the audit endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);

    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    await screen.findByText(/relution https:\/\/relution\.example\.test \| read-only/i);

    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "IOS Baseline" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));

    await screen.findByText(/expected policies must use platform=policy a,policy b entries separated by semicolons/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not report a created Zammad ticket without an addressable identifier", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      if (url === "/api/relution/devices/audit") {
        return jsonResponse(campusIpadAuditResponse());
      }
      if (url === "/api/zammad/session") {
        return jsonResponse({ configured: true, baseUrl: "https://zammad.example.test", tokenConfigured: true, group: "IT", customer: "it@example.test" });
      }
      if (url === "/api/zammad/tickets") {
        return jsonResponse({ ticket: { raw: {} } });
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);

    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
    fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    await screen.findByText(/relution https:\/\/relution\.example\.test \| read-only/i);

    fireEvent.change(screen.getByLabelText(/expected policies/i), { target: { value: "IOS=Baseline iOS" } });
    fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
    await screen.findByText(/campus ipad/i);

    fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
    fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
    await screen.findByText(/zammad https:\/\/zammad\.example\.test/i);

    fireEvent.click(screen.getByRole("button", { name: /ticket: missing-policy/i }));
    await screen.findByText(/MDM non-compliance: Campus iPad/i);
    fireEvent.click(screen.getByRole("button", { name: /review ticket destination/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm and create ticket/i }));

    await screen.findByText(/zammad ticket creation returned no ticket id or number/i);
    expect(screen.queryByText(/ticket created: unknown/i)).toBeNull();
  });

  it("keeps the latest audit result when same-domain requests complete in reverse order", async () => {
    const firstAudit = deferred<Response>();
    const secondAudit = deferred<Response>();
    let auditRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        return jsonResponse({ configured: true, baseUrl: "https://relution.example.test", tokenConfigured: true, mode: "read-only" });
      }
      if (url === "/api/relution/devices/audit") {
        auditRequests += 1;
        return auditRequests === 1 ? firstAudit.promise : secondAudit.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);
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

  it("does not restore an audit from the session being replaced", async () => {
    const oldAudit = deferred<Response>();
    let sessionRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        sessionRequests += 1;
        return jsonResponse({
          configured: true,
          baseUrl: `https://relution-${String(sessionRequests)}.example.test`,
          tokenConfigured: true,
          mode: "read-only",
        });
      }
      if (url === "/api/relution/devices/audit") return oldAudit.promise;
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);
    await configureRelution("relution-1.example.test");
    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution-new.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "new-token" } });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /run audit/i }));
      fireEvent.click(screen.getByRole("button", { name: /set session/i }));
    });
    await screen.findByText(/relution https:\/\/relution-2\.example\.test \| read-only/i);

    await act(async () => oldAudit.resolve(jsonResponse(auditResponseFor("Old tenant iPad", "old-assessment"))));
    await waitFor(() => expect(screen.queryByText(/working/i)).toBeNull());
    expect(screen.queryByText(/old tenant ipad/i)).toBeNull();
  });

  it("keeps loading until overlapping requests settle and ignores an older request error", async () => {
    const relutionSession = deferred<Response>();
    const zammadSession = deferred<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") return relutionSession.promise;
      if (url === "/api/zammad/session") return zammadSession.promise;
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);
    fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "relution-token" } });
    fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad.example.test" } });
    fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
    fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /set session/i }));
      fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
    });
    await screen.findByText(/working/i);

    await act(async () => zammadSession.resolve(jsonResponse({ configured: true, baseUrl: "https://zammad.example.test", tokenConfigured: true })));
    await screen.findByText(/zammad https:\/\/zammad\.example\.test/i);
    expect(screen.getByText(/working/i)).toBeTruthy();

    await act(async () => relutionSession.reject(new Error("obsolete Relution failure")));
    await waitFor(() => expect(screen.queryByText(/working/i)).toBeNull());
    expect(screen.queryByText(/obsolete relution failure/i)).toBeNull();
  });

  it("clears the selected ticket when either configured service is replaced", async () => {
    let relutionSessions = 0;
    let zammadSessions = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/relution/session") {
        relutionSessions += 1;
        return jsonResponse({ configured: true, baseUrl: `https://relution-${String(relutionSessions)}.example.test`, tokenConfigured: true, mode: "read-only" });
      }
      if (url === "/api/relution/devices/audit") return jsonResponse(campusIpadAuditResponse());
      if (url === "/api/zammad/session") {
        zammadSessions += 1;
        return jsonResponse({ configured: true, baseUrl: `https://zammad-${String(zammadSessions)}.example.test`, tokenConfigured: true });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<RelutionDashboardPanel />);
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

async function configureRelution(baseHost = "relution.example.test"): Promise<void> {
  fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: "relution.example.test" } });
  fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
  fireEvent.click(screen.getByRole("button", { name: /set session/i }));
  await screen.findByText(new RegExp(`relution https://${escapeRegExp(baseHost)} \\| read-only`, "i"));
}

async function configureZammad(baseHost = "zammad-1.example.test"): Promise<void> {
  fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: "zammad.example.test" } });
  fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
  fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
  await screen.findByText(new RegExp(`zammad https://${escapeRegExp(baseHost)}`, "i"));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function auditResponseFor(deviceName: string, assessmentId: string): ReturnType<typeof campusIpadAuditResponse> & { assessmentId: string } {
  const response = campusIpadAuditResponse();
  response.query.devices[0]!.name = deviceName;
  response.report.devices[0]!.device.name = deviceName;
  return { ...response, assessmentId };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function campusIpadAuditResponse(options: {
  readonly total?: number;
  readonly truncated?: boolean;
  readonly inactiveDays?: number;
  readonly inactiveProblem?: number;
} = {}) {
  const device = {
    uuid: "DEVICE-1",
    name: "Campus iPad",
    platform: "IOS",
    status: "COMPLIANT",
    policyStatus: "APPLIED",
    assignedPolicies: ["Other Policy"],
    ...(options.inactiveDays === undefined ? {} : { inactiveDays: options.inactiveDays }),
    raw: {},
  };
  const query = {
    baseUrl: "https://relution.example.test",
    count: 1,
    ...(options.total === undefined ? {} : { total: options.total }),
    truncated: options.truncated ?? false,
    devices: [device],
  };
  const coverageStatus = options.total === undefined ? "unknown" : options.truncated === true ? "partial" : "complete";
  return {
    query,
    report: {
      generatedAt: "2026-04-26T10:00:00.000Z",
      baseUrl: "https://relution.example.test",
      completeness: {
        assessedCount: 1,
        ...(options.total === undefined ? {} : { total: options.total }),
        truncated: options.truncated ?? false,
        status: coverageStatus,
      },
      summary: {
        totalDevices: 1,
        compliant: 0,
        issue: 1,
        notCheckable: 0,
        missingPolicy: 1,
        inactiveWarning: 0,
        inactiveProblem: options.inactiveProblem ?? 0,
        byPlatform: { IOS: 1 },
        byStatus: { COMPLIANT: 1 },
        byPolicyStatus: { APPLIED: 1 },
      },
      devices: [
        {
          status: "issue",
          device,
          issues: [
            {
              id: "missing-policy",
              severity: "problem",
              message: "Missing expected policies: Baseline iOS.",
              evidence: { missingPolicies: "Baseline iOS" },
            },
          ],
        },
      ],
    },
  };
}

function requestJson(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body ?? "{}")) as unknown;
}
