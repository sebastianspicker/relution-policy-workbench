/** Covers Relution assessment evidence and boundary validation. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  assessmentCompleteness,
  createRelutionAssessmentReport,
  normalizeRelutionConnection,
  queryRelutionDevices as queryRelutionDevicesWithTransport,
} from "../src/relution-api.js";
import { TEST_HTTP_SERVICE_TRANSPORT } from "./http-service-test-adapter.js";

async function queryRelutionDevices(
  connection: Parameters<typeof queryRelutionDevicesWithTransport>[0],
  input: Parameters<typeof queryRelutionDevicesWithTransport>[1],
) {
  return await queryRelutionDevicesWithTransport(connection, input, TEST_HTTP_SERVICE_TRANSPORT);
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
