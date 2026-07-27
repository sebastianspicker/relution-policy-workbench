/** Focused useEditorController recommendation imports controller scenarios. */
import { act, afterEach, createRecommendationCatalog, currentReady, describe, expect, it, renderRecommendationController, vi, waitFor } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController recommendation imports", () => {
it("loads recommendation summaries and the active source catalog", async () => {
    const { result } = await renderRecommendationController();

    await waitFor(() => {
      expect(currentReady(result).controller.recommendationIndex?.sources.length).toBe(3);
    });

    expect(currentReady(result).controller.recommendationPlatform).toBe("IOS");
  });

  it("imports the bundled recommendation ruleset for the selected platform", async () => {
    const { result } = await renderRecommendationController();

    await act(async () => {
      await currentReady(result).controller.importRecommendationRuleset();
    });

    expect(currentReady(result).controller.inspectorTab).toBe("validation");
    expect(currentReady(result).controller.isDirty).toBe(true);
    expect(currentReady(result).controller.rulesetReport?.applied.length).toBe(1);
    expect(currentReady(result).controller.status).toContain("Imported ruleset BSI Recommendations");
  });

  it("imports only actionable bundled recommendation settings", async () => {
    const { result } = await renderRecommendationController(createRecommendationCatalog({
          ruleset: {
            version: 1,
            name: "BSI Recommendations",
            policies: [
              {
                platform: "IOS",
                name: "iOS BSI Grundschutz",
                rules: [
                  {
                    id: "bsi-ios-informational",
                    title: "Informational evidence",
                    informational: true,
                    mappings: [
                      {
                        kind: "relution-native",
                        type: "NATIVE_SINGLE",
                        values: {
                          type: "NATIVE_SINGLE",
                          name: "Should not be imported",
                        },
                      },
                    ],
                  },
                  {
                    id: "bsi-ios-unmapped",
                    title: "Unmapped evidence",
                  },
                  {
                    id: "bsi-ios-actionable",
                    title: "Actionable setting",
                    mappings: [
                      {
                        kind: "relution-native",
                        type: "NATIVE_MULTI",
                        values: {
                          type: "NATIVE_MULTI",
                          name: "Actionable imported setting",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }));

    await act(async () => {
      await currentReady(result).controller.importRecommendationRuleset();
    });

    expect(currentReady(result).controller.rulesetReport?.applied.map((entry) => entry.ruleId)).toEqual(["bsi-ios-actionable"]);
    expect(JSON.stringify(currentReady(result).controller.state.workspace)).not.toContain("Should not be imported");
  });
});
