/** Recommendation-controller lifecycle shared by recommendation scenarios. */
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import type { RecommendationCatalogResponse } from "../../../src/recommendation-types.js";
import { currentReady } from "./useEditorController.test-core.js";
import { createAppState } from "./useEditorController.test-fixtures.js";
import { createRecommendationCatalog, createRecommendationIndex } from "./useEditorController.test-recommendation-fixtures.js";
import { renderSelectedController } from "./useEditorController.test-runner.js";

export async function renderRecommendationController(catalog: RecommendationCatalogResponse = createRecommendationCatalog()) {
  const hook = await renderSelectedController(createAppState(), { recommendationIndex: createRecommendationIndex(), recommendationCatalogs: { bsi: catalog } });
  await waitFor(() => { expect(currentReady(hook.result).controller.recommendationCatalog?.source).toBe("bsi"); });
  return hook;
}
