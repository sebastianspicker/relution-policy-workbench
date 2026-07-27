/** Focused useEditorController compliance state controller scenarios. */
import { act, afterEach, createComplianceReport, createRecommendationCatalog, createSidecar, createValidation, createWorkspace, currentReady, describe, expect, it, renderComplianceController, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController compliance state", () => {
it("loads a compliance report when a policy version is selected", async () => {
    const { result } = await renderComplianceController();

    expect(currentReady(result).controller.complianceSources).toEqual(["bsi", "vendor", "cis"]);
    expect(currentReady(result).controller.complianceReport?.results[0]?.status).toBe("exact-gap");
  });

  it("applies an exact compliance remediation and replaces the local workspace with the persisted result", async () => {
    const updatedWorkspace = createWorkspace();
    const document = updatedWorkspace.policies[0]?.document as { versions?: Array<{ configurations?: Array<Record<string, unknown>> }> } | undefined;
    const version = document?.versions?.[0];
    version?.configurations?.push({
      uuid: "CONF-2",
      details: {
        uuid: "DETAIL-2",
        type: "NATIVE_MULTI",
        enforced: true,
      },
    });
    const { result } = await renderComplianceController(undefined, {
      complianceApply: {
        workspace: updatedWorkspace,
        validation: createValidation(),
        sidecar: createSidecar(),
        report: createComplianceReport({
          results: [
            {
              id: "bsi:bsi-native-gap",
              source: "bsi",
              recommendationId: "bsi-native-gap",
              recommendation: createRecommendationCatalog().recommendations[0]!,
              status: "compliant",
              mappingResults: [
                {
                  kind: "relution-native",
                  target: "NATIVE_MULTI",
                  expectedValues: { enforced: true },
                  status: "compliant",
                  matchingConfigurations: [
                    {
                      configurationIndex: 1,
                      type: "NATIVE_MULTI",
                      label: "NATIVE_MULTI",
                    },
                  ],
                  candidateConfigurations: [
                    {
                      configurationIndex: 1,
                      type: "NATIVE_MULTI",
                      label: "NATIVE_MULTI",
                    },
                  ],
                },
              ],
              matchedConfigurations: [
                {
                  configurationIndex: 1,
                  type: "NATIVE_MULTI",
                  label: "NATIVE_MULTI",
                },
              ],
              blockingReasons: [],
              remediationOptions: [],
            },
          ],
          summary: {
            totalRecommendations: 1,
            byStatus: {
              compliant: 1,
              "exact-gap": 0,
              "choice-required": 0,
              "parameter-required": 0,
              "not-checkable": 0,
            },
          },
        }),
      },
    });

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    const ready = currentReady(result).controller;
    const configurations = (((ready.state.workspace.policies[0]?.document.versions as Array<{ configurations?: Array<{ details?: Record<string, unknown> }> }> | undefined)?.[0]?.configurations) ?? []);
    expect(ready.isDirty).toBe(false);
    expect(ready.complianceReport?.results[0]?.status).toBe("compliant");
    expect(configurations.some((entry) => entry.details?.type === "NATIVE_MULTI" && entry.details.enforced === true)).toBe(true);
    expect(ready.status).toContain("Applied compliance remediation");
  });
});
