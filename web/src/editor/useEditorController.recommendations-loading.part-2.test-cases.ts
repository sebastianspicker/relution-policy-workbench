/** Recommendation-loading scenarios for failed and superseded catalog requests. */
import { act, controllerSuite, createRecommendationCatalog, currentReady, deferred, expect, it, waitFor } from "./useEditorController.test-harness.js";
import { renderPendingBsiCatalog, renderRecommendationLoading, resolveRecommendationResponse, waitForRecommendationCatalog, waitForRecommendationIndex } from "./useEditorController.recommendations-loading-test-helpers.js";

controllerSuite("useEditorController recommendation loading", () => {
  it("clears loading and reports an error when the selected catalog request fails", async () => {
    const { catalog, result } = await renderPendingBsiCatalog();
    expect(currentReady(result).controller.recommendationsLoading).toBe(true);

    await resolveRecommendationResponse(catalog, { error: "catalog unavailable" }, 500);

    await waitFor(() => { expect(currentReady(result).controller.recommendationsError).toContain("catalog unavailable"); });
    expect(currentReady(result).controller.recommendationCatalog).toBeUndefined();
    expect(currentReady(result).controller.recommendationsLoading).toBe(false);
  });

  it("keeps loading for a new source when the previous source request resolves late", async () => {
    const bsi = deferred<Response>();
    const vendor = deferred<Response>();
    const result = await renderRecommendationLoading({ "/api/recommendations/bsi": bsi.promise, "/api/recommendations/vendor": vendor.promise });

    await waitForRecommendationIndex(result);
    await act(async () => { currentReady(result).controller.setRecommendationSource("vendor"); });
    await waitFor(() => { expect(currentReady(result).controller.recommendationSource).toBe("vendor"); });

    await resolveRecommendationResponse(bsi, createRecommendationCatalog());
    expect(currentReady(result).controller.recommendationCatalog).toBeUndefined();
    expect(currentReady(result).controller.recommendationsLoading).toBe(true);

    await resolveRecommendationResponse(vendor, createRecommendationCatalog({ source: "vendor", label: "Vendor", displayPlatforms: ["ANDROID"] }));
    await waitForRecommendationCatalog(result, "vendor");
    expect(currentReady(result).controller.recommendationsLoading).toBe(false);
  });
});
