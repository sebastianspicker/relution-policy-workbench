/** Covers Relution HTTP contract parsing, pagination, and assessment semantics. */
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import test from "node:test";
import {
  assessmentCompleteness,
  assessRelutionDevices,
  assertRelutionReadOnlyRequest,
  createRelutionAssessmentReport,
  normalizeRelutionConnection,
  normalizeRelutionDeviceSummary,
  publicRelutionSession,
  queryRelutionDevices as queryRelutionDevicesWithTransport,
  testRelutionConnection as testRelutionConnectionWithTransport,
} from "../src/relution-api.js";
import { handleRelutionApiRequest } from "../src/relution-editor-routes.js";
import { TEST_HTTP_SERVICE_TRANSPORT } from "./http-service-test-adapter.js";

async function queryRelutionDevices(
  connection: Parameters<typeof queryRelutionDevicesWithTransport>[0],
  input: Parameters<typeof queryRelutionDevicesWithTransport>[1],
) {
  return await queryRelutionDevicesWithTransport(connection, input, TEST_HTTP_SERVICE_TRANSPORT);
}

async function testRelutionConnection(connection: Parameters<typeof testRelutionConnectionWithTransport>[0]) {
  return await testRelutionConnectionWithTransport(connection, TEST_HTTP_SERVICE_TRANSPORT);
}

test("normalizes Relution connection settings without exposing the token publicly", () => {
  const connection = normalizeRelutionConnection({
    protocol: "http",
    host: "http://127.0.0.1",
    port: 8080,
    apiToken: "secret-token",
    allowLocalServiceHosts: true,
  });

  assert.equal(connection.baseUrl, "http://127.0.0.1:8080");
  assert.deepEqual(publicRelutionSession(connection), {
    configured: true,
    baseUrl: "http://127.0.0.1:8080",
    tokenConfigured: true,
    mode: "read-only",
  });
});

test("derives protocol port and base path from host URLs", () => {
  const connection = normalizeRelutionConnection({
    host: "https://relution.example.test:8443/customer-a/",
    apiToken: "secret-token",
  });

  assert.equal(connection.protocol, "https");
  assert.equal(connection.host, "relution.example.test");
  assert.equal(connection.port, 8443);
  assert.equal(connection.basePath, "/customer-a");
  assert.equal(connection.baseUrl, "https://relution.example.test:8443/customer-a");
});

test("normalizes raw and bracketed IPv6 Relution hosts into valid URLs", () => {
  const raw = normalizeRelutionConnection({ host: "::1", apiToken: "secret-token", allowLocalServiceHosts: true });
  const bracketed = normalizeRelutionConnection({
    host: "[::1]",
    port: 8443,
    apiToken: "secret-token",
    allowLocalServiceHosts: true,
  });

  assert.equal(raw.baseUrl, "https://[::1]");
  assert.equal(bracketed.baseUrl, "https://[::1]:8443");
  assert.doesNotThrow(() => new URL(raw.baseUrl));
  assert.doesNotThrow(() => new URL(bracketed.baseUrl));
});

test("rejects cleartext Relution connections without explicit local/lab opt-in", () => {
  assert.throws(
    () => normalizeRelutionConnection({ host: "http://relution.example.test", apiToken: "secret-token" }),
    /HTTP connections require --allow-local-service-hosts/u,
  );
});

test("Relution connection test validates the device query response body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://relution.example.test/api/v2/devices/baseInfo/query");
    assert.match(String(init?.body), /"limit":1/u);
    return new Response(JSON.stringify({ nonpagedCount: 0, results: [] }));
  };
  try {
    const result = await testRelutionConnection(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
    );

    assert.deepEqual(result, { ok: true, baseUrl: "https://relution.example.test" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Relution connection test returns a failure signal for malformed 200 responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "unauthorized" }));
  try {
    const result = await testRelutionConnection(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
    );

    assert.deepEqual(result, {
      ok: false,
      baseUrl: "https://relution.example.test",
      reason: "Relution connection test returned an unexpected device query response.",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Relution connection test rejects non-record device results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [null] }));
  try {
    const result = await testRelutionConnection(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
    );

    assert.deepEqual(result, {
      ok: false,
      baseUrl: "https://relution.example.test",
      reason: "Relution connection test returned an unexpected device query response.",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("queries and normalizes Relution device responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://relution.example.test/api/v2/devices/baseInfo/query");
    assert.equal((init?.headers as Record<string, string>)["X-User-Access-Token"], "secret-token");
    assert.match(String(init?.body), /ANDROID_ENTERPRISE/u);
    assert.match(String(init?.body), /CORPORATE/u);
    assert.match(String(init?.body), /"name":"name"/u);
    assert.match(String(init?.body), /"ascending":true/u);
    return new Response(JSON.stringify({
      nonpagedCount: 1,
      results: [
        {
          uuid: "DEVICE-1",
          name: "Campus iPad",
          platform: "IOS",
          status: "COMPLIANT",
          policyStatus: "APPLIED",
          lastConnectionDate: "2026-04-26T10:00:00.000Z",
          ownership: "CORPORATE",
          serialNumber: "SERIAL-1",
          userEmail: "student@example.test",
          assignedPolicies: [{ name: "Baseline iOS" }],
          diagnostics: { bearerToken: "must-not-reach-browser" },
        },
      ],
    }));
  };
  try {
    const result = await queryRelutionDevices(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
      {
        platforms: ["ANDROID_ENTERPRISE"],
        statuses: ["COMPLIANT"],
        ownerships: ["CORPORATE"],
        sortField: "name",
        sortAscending: true,
      },
    );

    assert.equal(result.total, 1);
    assert.equal(result.truncated, false);
    assert.equal(result.devices[0]?.name, "Campus iPad");
    assert.equal(result.devices[0]?.policyStatus, "APPLIED");
    assert.equal(result.devices[0]?.serialNumber, "SERIAL-1");
    assert.deepEqual(result.devices[0]?.assignedPolicies, ["Baseline iOS"]);
    assert.deepEqual(result.devices[0]?.raw, {});
    assert.equal(JSON.stringify(result).includes("must-not-reach-browser"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes remote devices without stable identities as not-checkable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    results: [{ uuid: "   ", id: "", name: "Unidentified iPad", status: "COMPLIANT", policyStatus: "APPLIED" }],
  }));
  try {
    const result = await queryRelutionDevices(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
      {},
    );

    assert.equal(result.devices[0]?.uuid, undefined);
    const report = assessRelutionDevices("https://relution.example.test", result.devices);
    assert.equal(report.summary.compliant, 0);
    assert.equal(report.summary.notCheckable, 1);
    assert.equal(report.devices[0]?.status, "not-checkable");
    assert.equal(report.devices[0]?.issues[0]?.id, "device-identity-missing");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("missing device identity does not suppress known compliance problems", () => {
  const report = assessRelutionDevices("https://relution.example.test", [{
    name: "Unidentified inactive device",
    status: "INACTIVE",
    policyStatus: "NONE",
    raw: {},
  }]);

  assert.equal(report.summary.issue, 1);
  assert.equal(report.summary.notCheckable, 0);
  assert.equal(report.devices[0]?.status, "issue");
  assert.deepEqual(
    report.devices[0]?.issues.map((issue) => issue.id),
    ["device-identity-missing", "device-status-noncompliant", "policy-status-not-applied"],
  );
});

test("marks Relution device queries truncated when the page is smaller than the reported total", async () => {
  const originalFetch = globalThis.fetch;
  const devices = Array.from({ length: 100 }, (_, index) => ({
    uuid: `DEVICE-${String(index + 1)}`,
    name: `Device ${String(index + 1)}`,
  }));
  globalThis.fetch = async () => new Response(JSON.stringify({ nonpagedCount: 200, results: devices }));
  try {
    const result = await queryRelutionDevices(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
      {},
    );

    assert.equal(result.count, 100);
    assert.equal(result.total, 200);
    assert.equal(result.truncated, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses nonpagedCount for completeness when a page-sized total is also present", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    nonpagedCount: 200,
    total: 1,
    results: [{ uuid: "DEVICE-1", name: "Device 1" }],
  }));
  try {
    const result = await queryRelutionDevices(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
      {},
    );

    assert.equal(result.total, 200);
    assert.equal(result.truncated, true);
    assert.equal(assessmentCompleteness(result).status, "partial");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("treats an explicit empty policy assignment list as known missing policy evidence", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    nonpagedCount: 1,
    results: [{ uuid: "DEVICE-1", name: "Device 1", platform: "IOS", assignedPolicies: [] }],
  }));
  try {
    const result = await queryRelutionDevices(
      normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
      {},
    );
    assert.deepEqual(result.devices[0]?.assignedPolicies, []);
    const report = createRelutionAssessmentReport("https://relution.example.test", result.devices, {
      expectedPoliciesByPlatform: { IOS: ["Baseline iOS"] },
    });
    assert.equal(report.devices[0]?.issues.some((issue) => issue.id === "missing-policy"), true);
    assert.equal(report.devices[0]?.issues.some((issue) => issue.id === "policy-assignment-unknown"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed Relution device query responses without treating them as empty", async () => {
  const originalFetch = globalThis.fetch;
  const connection = normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" });
  try {
    for (const body of [{}, { results: "none" }, []]) {
      globalThis.fetch = async () => new Response(JSON.stringify(body));
      await assert.rejects(
        queryRelutionDevices(connection, {}),
        /Malformed Relution device query response: expected results array/u,
      );
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ results: [null] }));
    await assert.rejects(
      queryRelutionDevices(connection, {}),
      /each result must be an object/u,
    );
    globalThis.fetch = async () => new Response(JSON.stringify({ results: [] }));
    const result = await queryRelutionDevices(connection, {});
    assert.equal(result.count, 0);
    assert.equal(result.truncated, false);
    assert.deepEqual(result.devices, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects Relution device pages larger than the requested limit before normalization", async () => {
  const originalFetch = globalThis.fetch;
  const results = Array.from({ length: 1_001 }, () => ({ name: "Device" }));
  globalThis.fetch = async () => new Response(JSON.stringify({ results }));
  try {
    await assert.rejects(
      queryRelutionDevices(
        normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
        { limit: 1_000 },
      ),
      /returned device count exceeds the requested limit/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sanitizes failed Relution API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    "secret-token Bearer unrelated-token student@example.test Campus iPad Device owner Alice",
    { status: 401, statusText: "Unauthorized" },
  );
  try {
    await assert.rejects(
      queryRelutionDevices(normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }), {}),
      (error) => {
        assert.equal(error instanceof Error, true);
        const message = (error as Error).message;
        assert.equal(message, "Relution API request failed: 401 Unauthorized");
        assert.doesNotMatch(message, /secret-token/u);
        assert.doesNotMatch(message, /unrelated-token/u);
        assert.doesNotMatch(message, /student@example\.test/u);
        assert.doesNotMatch(message, /Campus iPad/u);
        assert.doesNotMatch(message, /Alice/u);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("blocks non-read-only Relution API requests at the low-level client boundary", () => {
  assert.doesNotThrow(() => assertRelutionReadOnlyRequest("POST", "/api/v2/devices/baseInfo/query"));
  assert.throws(
    () => assertRelutionReadOnlyRequest("POST", "/api/v2/devices/actions/wipe"),
    /Blocked non-read-only Relution API request/u,
  );
  assert.throws(
    () => assertRelutionReadOnlyRequest("PUT", "/api/v2/policies/123"),
    /Blocked non-read-only Relution API request/u,
  );
});

test("Relution editor routes re-check outbound host policy before each request", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response("{}");
  };
  try {
    await assert.rejects(
      handleRelutionApiRequest(
        new URL("http://localhost/api/relution/test"),
        { method: "POST" } as never,
        {} as never,
        {
          lastDevices: [],
          connection: normalizeRelutionConnection({
            protocol: "http",
            host: "127.0.0.1",
            apiToken: "secret-token",
            allowLocalServiceHosts: true,
          }),
        },
        "/tmp/workspace",
        false,
      ),
      /blocked local\/private address/u,
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Relution assessment route does not mark client-supplied identity-less devices compliant", async () => {
  const response = createJsonResponse();
  const request = Readable.from([Buffer.from(JSON.stringify({
    devices: [{ uuid: "   ", id: "", name: "Unidentified iPad", status: "COMPLIANT", policyStatus: "APPLIED" }],
  }))]);
  Object.assign(request, { method: "POST" });
  const runtime = {
    lastDevices: [],
    connection: normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }),
  };

  assert.equal(
    await handleRelutionApiRequest(
      new URL("http://localhost/api/relution/devices/assess"),
      request as never,
      response as never,
      runtime,
      "/tmp/workspace",
    ),
    true,
  );
  const body = JSON.parse(response.body) as { report: { summary: { compliant: number; notCheckable: number }; devices: Array<{ status: string; issues: Array<{ id: string }> }> } };
  assert.equal(body.report.summary.compliant, 0);
  assert.equal(body.report.summary.notCheckable, 1);
  assert.equal(body.report.devices[0]?.status, "not-checkable");
  assert.equal(body.report.devices[0]?.issues[0]?.id, "device-identity-missing");
});

test("normalizes a non-blank stable Relution identity", () => {
  assert.equal(normalizeRelutionDeviceSummary({ id: "  DEVICE-1  ", name: "Campus iPad" }).uuid, "DEVICE-1");
});

test("assesses device status and policy status into report findings", () => {
  const report = assessRelutionDevices("https://relution.example.test", [
    {
      uuid: "DEVICE-1",
      name: "Campus iPad",
      platform: "IOS",
      status: "COMPLIANT",
      policyStatus: "APPLIED",
      raw: {},
    },
    {
      uuid: "DEVICE-2",
      name: "Dorm Android",
      platform: "ANDROID_ENTERPRISE",
      status: "INACTIVE",
      policyStatus: "NONE",
      raw: {},
    },
  ]);

  assert.equal(report.summary.totalDevices, 2);
  assert.equal(report.summary.compliant, 1);
  assert.equal(report.summary.issue, 1);
  assert.equal(report.devices[1]?.issues.length, 2);
  assert.equal(report.devices[1]?.issues[0]?.id, "device-status-noncompliant");
});

test("classifies known warning findings as issues rather than not-checkable", () => {
  const report = assessRelutionDevices("https://relution.example.test", [{
    uuid: "DEVICE-WARNING",
    name: "Pending policy device",
    platform: "IOS",
    status: "COMPLIANT",
    policyStatus: "PENDING",
    raw: {},
  }]);

  assert.equal(report.summary.issue, 1);
  assert.equal(report.summary.notCheckable, 0);
  assert.equal(report.devices[0]?.status, "issue");
  assert.equal(report.devices[0]?.issues[0]?.severity, "warning");
});

function createJsonResponse(): EventEmitter & { body: string; writeHead: (status: number) => void; end: (body: string) => void } {
  const response = new EventEmitter() as EventEmitter & { body: string; writeHead: (status: number) => void; end: (body: string) => void };
  response.body = "";
  response.writeHead = () => undefined;
  response.end = (body) => { response.body = body; };
  return response;
}

test("audits missing policies and inactive devices with evidence", () => {
  const report = createRelutionAssessmentReport(
    "https://relution.example.test",
    [
      {
        uuid: "DEVICE-1",
        name: "Campus iPad",
        platform: "IOS",
        status: "COMPLIANT",
        policyStatus: "APPLIED",
        assignedPolicies: ["Baseline iOS"],
        lastConnectionDate: "2026-03-01T00:00:00.000Z",
        raw: {},
      },
      {
        uuid: "DEVICE-2",
        name: "Dorm iPad",
        platform: "IOS",
        status: "COMPLIANT",
        policyStatus: "APPLIED",
        assignedPolicies: ["Other Policy"],
        lastConnectionDate: "2026-01-01T00:00:00.000Z",
        raw: {},
      },
      {
        uuid: "DEVICE-3",
        name: "Unknown policy iPad",
        platform: "IOS",
        status: "COMPLIANT",
        policyStatus: "APPLIED",
        raw: {},
      },
    ],
    {
      expectedPoliciesByPlatform: { IOS: ["Baseline iOS"] },
      inactiveWarningDays: 30,
      inactiveProblemDays: 90,
      now: new Date("2026-04-26T00:00:00.000Z"),
    },
  );

  assert.equal(report.summary.missingPolicy, 1);
  assert.equal(report.summary.inactiveWarning, 2);
  assert.equal(report.summary.inactiveProblem, 1);
  assert.equal(report.devices[1]?.issues.some((issue) => issue.id === "missing-policy"), true);
  assert.equal(report.devices[1]?.issues.some((issue) => issue.id === "inactive-problem"), true);
  assert.equal(report.devices[2]?.issues.some((issue) => issue.id === "policy-assignment-unknown"), true);
});

test("assesses prototype-named platform and status values with safe JSON dictionaries", () => {
  const keys = ["__proto__", "constructor", "toString"];
  const expectedPoliciesByPlatform = Object.fromEntries(keys.map((key) => [key, [`${key} baseline`]]));
  const report = createRelutionAssessmentReport(
    "https://relution.example.test",
    keys.map((key) => ({
      uuid: `DEVICE-${key}`,
      name: `${key} device`,
      platform: key,
      status: key,
      policyStatus: key,
      assignedPolicies: [],
      raw: {},
    })),
    { expectedPoliciesByPlatform },
  );

  assert.equal(report.summary.missingPolicy, keys.length);
  for (const counts of [report.summary.byPlatform, report.summary.byStatus, report.summary.byPolicyStatus]) {
    for (const key of keys) {
      assert.equal(Object.hasOwn(counts, key), true);
      assert.equal(counts[key], 1);
    }
    assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(counts)) as Record<string, number>).sort(), [...keys].sort());
  }
});

test("validates expected policy dictionaries at the assessment boundary", () => {
  assert.throws(
    () => createRelutionAssessmentReport(
      "https://relution.example.test",
      [],
      { expectedPoliciesByPlatform: { IOS: "Baseline" } as unknown as Record<string, string[]> },
    ),
    /Expected policies for platform IOS must be a string array/u,
  );
});

test("rejects unsafe or misordered inactivity thresholds before classifying devices", () => {
  const device = [{
    uuid: "DEVICE-1",
    name: "Campus iPad",
    status: "COMPLIANT",
    policyStatus: "APPLIED",
    lastConnectionDate: "2026-03-07T00:00:00.000Z",
    raw: {},
  }];
  const options = { now: new Date("2026-04-26T00:00:00.000Z") };

  assert.throws(
    () => createRelutionAssessmentReport("https://relution.example.test", device, { ...options, inactiveWarningDays: 90, inactiveProblemDays: 30 }),
    /problem days must be greater than or equal to inactive warning days/u,
  );
  assert.throws(
    () => createRelutionAssessmentReport("https://relution.example.test", device, { ...options, inactiveWarningDays: -1 }),
    /warning days must be a non-negative safe integer/u,
  );
  assert.throws(
    () => createRelutionAssessmentReport("https://relution.example.test", device, { ...options, inactiveProblemDays: 1.5 }),
    /problem days must be a non-negative safe integer/u,
  );
  assert.throws(
    () => createRelutionAssessmentReport("https://relution.example.test", [], { inactiveWarningDays: 90, inactiveProblemDays: 30 }),
    /problem days must be greater than or equal to inactive warning days/u,
  );
  assert.throws(
    () => createRelutionAssessmentReport("https://relution.example.test", device, { now: new Date("invalid") }),
    /assessment time must be a valid date/u,
  );
});

test("distinguishes complete, partial, and unknown assessment coverage", () => {
  assert.equal(assessmentCompleteness({ count: 1, total: 1, truncated: false }).status, "complete");
  assert.equal(assessmentCompleteness({ count: 1, total: 2, truncated: true }).status, "partial");
  assert.equal(assessmentCompleteness({ count: 1, truncated: false }).status, "unknown");
});

test("rejects malformed device totals", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ nonpagedCount: -1, results: [] }));
  try {
    await assert.rejects(
      queryRelutionDevices(normalizeRelutionConnection({ host: "relution.example.test", apiToken: "secret-token" }), {}),
      /nonpagedCount must be a non-negative safe integer/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
