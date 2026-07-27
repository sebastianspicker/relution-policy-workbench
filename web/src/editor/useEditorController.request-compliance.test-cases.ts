/** Focused useEditorController compliance request intent request-intent scenarios. */
import { act, afterEach, createAppState, currentReady, describe, expect, it, renderComplianceController, vi, waitFor } from "./useEditorController.test-harness.js";
import { lastBodyFor } from "./useEditorController.request-intent-test-helpers.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController compliance request intent", () => {
it("posts the selected compliance remediation request before accepting the persisted response", async () => {
    const { requests, result } = await renderComplianceController();

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    const body = lastBodyFor(requests, "/api/compliance/apply");
    expect(body).toMatchObject({
      selection: { policyIndex: 0, versionIndex: 0 },
      sources: ["bsi", "vendor", "cis"],
      source: "bsi",
      recommendationId: "bsi-native-gap",
      remediationId: "native-bundle:bsi-native-bundle",
    });
    expect(JSON.stringify(body.workspace)).toContain("Original name");
    expect(currentReady(result).controller.status).toContain("Applied compliance remediation");
  });

  it("does not apply a compliance remediation from the previously selected policy", async () => {
    const state = createAppState();
    const firstPolicy = state.workspace.policies[0];
    if (firstPolicy === undefined) throw new Error("Expected compliance test policy");
    state.workspace.policies.push({
      path: "policies/other_policy.json",
      document: {
        ...firstPolicy.document,
        name: "Other Policy",
        versions: structuredClone(firstPolicy.document.versions),
      },
    });
    const { requests, result } = await renderComplianceController(state);
    await waitFor(() => {
      expect(currentReady(result).controller.complianceReport?.policyPath).toBe("policies/policy_test.json");
    });

    await act(async () => {
      currentReady(result).controller.setSelection({ policyIndex: 1, versionIndex: 0, configurationIndex: 0 });
    });
    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    expect(requests.filter((request) => request.url === "/api/compliance/apply")).toEqual([]);
    expect(currentReady(result).controller.status).toContain("Refresh compliance for the selected policy");
  });
});
