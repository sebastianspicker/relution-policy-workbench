/** Recommendation-loading scenarios for independently pending index and catalog requests. */
import { controllerSuite, createRecommendationCatalog, createRecommendationIndex, currentReady, deferred, expect, it } from "./useEditorController.test-harness.js";
import { renderPendingBsiCatalog, renderRecommendationLoading, resolveRecommendationResponse, waitForRecommendationCatalog, waitForRecommendationIndex } from "./useEditorController.recommendations-loading-test-helpers.js";

controllerSuite("useEditorController recommendation loading", () => {
  it("keeps loading while the selected catalog is still pending after the index resolves", async () => {
    const { catalog, result } = await renderPendingBsiCatalog();
    expect(currentReady(result).controller.recommendationCatalog).toBeUndefined();
    expect(currentReady(result).controller.recommendationsLoading).toBe(true);

    await resolveRecommendationResponse(catalog, createRecommendationCatalog());

    await waitForRecommendationCatalog(result, "bsi");
    expect(currentReady(result).controller.recommendationsLoading).toBe(false);
  });

  it("keeps loading while the index is still pending after the selected catalog resolves", async () => {
    const index = deferred<Response>();
    const result = await renderRecommendationLoading({ "/api/recommendations": index.promise });

    await waitForRecommendationCatalog(result, "bsi");
    expect(currentReady(result).controller.recommendationIndex).toBeUndefined();
    expect(currentReady(result).controller.recommendationsLoading).toBe(true);

    await resolveRecommendationResponse(index, createRecommendationIndex());

    await waitForRecommendationIndex(result);
    expect(currentReady(result).controller.recommendationsLoading).toBe(false);
  });
});
