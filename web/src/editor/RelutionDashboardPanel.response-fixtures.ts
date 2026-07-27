// Supports the editor UI and its focused test scenarios.
export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export function auditResponseFor(deviceName: string, assessmentId: string): ReturnType<typeof campusIpadAuditResponse> & { assessmentId: string } {
  const response = campusIpadAuditResponse();
  response.query.devices[0]!.name = deviceName;
  response.report.devices[0]!.device.name = deviceName;
  return { ...response, assessmentId };
}

export function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

export function requestJson(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body ?? "{}")) as unknown;
}

export function campusIpadAuditResponse(options: {
  readonly total?: number;
  readonly truncated?: boolean;
  readonly inactiveDays?: number;
  readonly inactiveProblem?: number;
} = {}) {
  const device = {
    uuid: "DEVICE-1", name: "Campus iPad", platform: "IOS", status: "COMPLIANT", policyStatus: "APPLIED", assignedPolicies: ["Other Policy"],
    ...(options.inactiveDays === undefined ? {} : { inactiveDays: options.inactiveDays }), raw: {},
  };
  const query = {
    baseUrl: "https://relution.example.test", count: 1, ...(options.total === undefined ? {} : { total: options.total }), truncated: options.truncated ?? false, devices: [device],
  };
  const coverageStatus = options.total === undefined ? "unknown" : options.truncated === true ? "partial" : "complete";
  return {
    query,
    report: {
      generatedAt: "2026-04-26T10:00:00.000Z", baseUrl: "https://relution.example.test",
      completeness: { assessedCount: 1, ...(options.total === undefined ? {} : { total: options.total }), truncated: options.truncated ?? false, status: coverageStatus },
      summary: { totalDevices: 1, compliant: 0, issue: 1, notCheckable: 0, missingPolicy: 1, inactiveWarning: 0, inactiveProblem: options.inactiveProblem ?? 0, byPlatform: { IOS: 1 }, byStatus: { COMPLIANT: 1 }, byPolicyStatus: { APPLIED: 1 } },
      devices: [{ status: "issue", device, issues: [{ id: "missing-policy", severity: "problem", message: "Missing expected policies: Baseline iOS.", evidence: { missingPolicies: "Baseline iOS" } }] }],
    },
  };
}
