/** Recommendation and baseline routes for the fetch double. */
import { jsonResponse } from "./useEditorController.test-core.js";
import { createRecommendationCatalog, createRecommendationIndex } from "./useEditorController.test-recommendation-fixtures.js";
import type { FetchMockOptions } from "./useEditorController.test-fetch-types.js";

export function recommendationCatalogResponse(url: string, options: FetchMockOptions): Response | undefined {
  if (url === "/api/recommendations") return jsonResponse(options.recommendationIndex ?? createRecommendationIndex());
  if (url === "/api/recommendations/bsi") return jsonResponse(options.recommendationCatalogs?.bsi ?? createRecommendationCatalog());
  if (url === "/api/recommendations/vendor") return jsonResponse(options.recommendationCatalogs?.vendor ?? createRecommendationCatalog({ source: "vendor", label: "Vendor", displayPlatforms: ["ANDROID"] }));
  if (url === "/api/recommendations/cis") return jsonResponse(options.recommendationCatalogs?.cis ?? createRecommendationCatalog({ source: "cis", label: "CIS" }));
  return undefined;
}
