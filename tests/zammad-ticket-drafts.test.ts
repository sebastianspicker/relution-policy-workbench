/** Covers deterministic Zammad draft wording for Relution assessment findings. */
import assert from "node:assert/strict";
import test from "node:test";
import type { RelutionAssessmentIssue, RelutionDeviceAssessment } from "../src/relution-api.js";
import { buildZammadTicketDraft } from "../src/zammad-ticket-drafts.js";

function assessment(inactiveDays?: number, uuid?: string): RelutionDeviceAssessment {
  return {
    status: "issue",
    device: {
      ...(uuid === undefined ? {} : { uuid }),
      name: "Dorm iPad",
      platform: "IOS",
      status: "COMPLIANT",
      policyStatus: "APPLIED",
      ...(inactiveDays === undefined ? {} : { inactiveDays }),
      raw: {},
    },
    issues: [],
  };
}

function inactiveIssue(evidence: Record<string, string> = {}): RelutionAssessmentIssue {
  return { id: "inactive-warning", severity: "warning", message: "Device has not checked in.", evidence };
}

test("non-compliant drafts omit missing UUIDs and expose absent evidence", () => {
  const draft = buildZammadTicketDraft(assessment(), {
    id: "missing-policy",
    severity: "problem",
    message: "Required policy is missing.",
    evidence: {},
  });
  assert.deepEqual(draft, {
    kind: "non-compliant-device",
    title: "MDM non-compliance: Dorm iPad",
    body: [
      "Relution device compliance finding", "", "Device", "- Name: Dorm iPad", "- UUID: unknown", "- Platform: IOS",
      "- User: unknown", "- Email: unknown", "- Serial: unknown", "- Ownership: unknown", "- Device status: COMPLIANT",
      "- Policy status: APPLIED", "- Last connection: unknown", "- Assigned policies: unknown", "- Assessment status: issue", "",
      "Finding", "- Issue: missing-policy", "- Severity: problem", "- Message: Required policy is missing.", "- Evidence: none exposed", "",
      "Recommended remediation", "- Check device enrollment and reachability in Relution.", "- Verify that the expected policy is assigned to the device.",
      "- Re-push the policy from Relution and check the policy status afterwards.", "- Contact the assigned user if the device is offline.",
      "- Document an exception if the policy is intentionally not assigned.",
    ].join("\n"),
    issueId: "missing-policy",
  });
});

test("inactive drafts use unknown wording for absent or invalid inactivity evidence", () => {
  for (const issue of [inactiveIssue(), inactiveIssue({ inactiveDays: "not-a-number" })]) {
    const draft = buildZammadTicketDraft(assessment(undefined, "DEVICE-1"), issue);
    assert.equal(draft.kind, "inactive-device");
    assert.equal(draft.title, "MDM inactive device: Dorm iPad (unknown)");
    assert.match(draft.body, /- Verify the last check-in timestamp in Relution\.\n- Contact the assigned user if the device should still be managed\./u);
  }
});

test("inactive drafts classify each remediation age band with exact titles and steps", () => {
  const cases = [
    [59, "- Contact the assigned user.\n- Ask the user to connect the device to the network.\n- Verify that Relution receives a fresh check-in."],
    [60, "- Escalate to IT follow-up.\n- Check ownership and user assignment.\n- Verify whether the device is still in active use."],
    [89, "- Escalate to IT follow-up.\n- Check ownership and user assignment.\n- Verify whether the device is still in active use."],
    [90, "- Treat this as a stale asset candidate.\n- Verify ownership and inventory status.\n- Decide whether the device should be unenrolled, retired, or recovered."],
  ] as const;
  for (const [inactiveDays, steps] of cases) {
    const draft = buildZammadTicketDraft(assessment(inactiveDays, "DEVICE-1"), inactiveIssue({ inactiveDays: String(inactiveDays) }));
    assert.equal(draft.kind, "inactive-device");
    assert.equal(draft.title, `MDM inactive device: Dorm iPad (${String(inactiveDays)}d)`);
    assert.equal(draft.deviceUuid, "DEVICE-1");
    assert.equal(draft.body.split("Recommended follow-up\n")[1], steps);
  }
});
