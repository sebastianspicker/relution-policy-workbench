/** Focused useEditorController ruleset request intent request-intent scenarios. */
import { act, afterEach, currentReady, describe, expect, importRulesetFile, it, renderComplianceController, renderController, vi } from "./useEditorController.test-harness.js";
import { lastBodyFor } from "./useEditorController.request-intent-test-helpers.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController ruleset request intent", () => {

  it("keeps blocked status when an uploaded ruleset is rejected", async () => {
    const uploadedRuleset = {
      version: 1,
      name: "Blocked uploaded ruleset",
      policies: [
        {
          platform: "IOS",
          name: "Blocked iOS",
          rules: [
            {
              id: "missing-uploaded-rule",
              title: "Missing uploaded rule",
              mappings: [],
            },
          ],
        },
      ],
    };
    const { requests, result } = await renderController();
    await importRulesetFile(result, uploadedRuleset, "blocked-ruleset.json");

    expect(currentReady(result).controller.status).toBe("Ruleset import blocked: 0 conflict(s), 1 unresolved rule(s)");
    expect(currentReady(result).controller.isDirty).toBe(false);
    expect(currentReady(result).controller.rulesetReport?.unresolved.map((entry) => entry.ruleId)).toEqual(["missing-uploaded-rule"]);
    expect(requests.some((request) => request.url === "/api/workspace/validate")).toBe(false);
  });

  it("does not post compliance apply when no policy is selected", async () => {
    const { requests, result } = await renderController();

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    expect(currentReady(result).controller.status).toBe("Select a policy before applying compliance remediation");
    expect(requests.filter((request) => request.url === "/api/compliance/apply")).toEqual([]);
  });

  it("keeps compliance apply failures visible when the API rejects the request", async () => {
    const { requests, result } = await renderComplianceController(undefined, {
      complianceApply: { error: "apply rejected" },
      complianceApplyStatus: 500,
    });

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    expect(lastBodyFor(requests, "/api/compliance/apply").remediationId).toBe("native-bundle:bsi-native-bundle");
    expect(currentReady(result).controller.status).toContain("Compliance remediation failed");
    expect(currentReady(result).controller.status).toContain("apply rejected");
  });
});
