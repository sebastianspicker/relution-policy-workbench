/** Fetch routes shared by recommendation-loading controller scenarios. */
import { act, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { createAppState } from "./useEditorController.test-fixtures.js";
import { createRecommendationCatalog, createRecommendationIndex } from "./useEditorController.test-recommendation-fixtures.js";
import { currentReady, jsonResponse } from "./useEditorController.test-core.js";
import { deferred, type Deferred } from "./useEditorController.test-deferred-requests.js";
import { installEndpointResponses } from "./useEditorController.test-endpoint-responses.js";
import { renderReadyController } from "./useEditorController.test-runner.js";
import type { EditorControllerResult } from "./types.js";

type RecommendationLoadingPath =
  | "/api/state"
  | "/api/recommendations"
  | "/api/recommendations/bsi"
  | "/api/recommendations/vendor"
  | "/api/recommendations/cis";

type RecommendationLoadingResponses = Record<RecommendationLoadingPath, Response | Promise<Response>>;
type ControllerResultRef = { current: EditorControllerResult };

function installRecommendationFetchMock(overrides: Partial<RecommendationLoadingResponses> = {}): void {
  installEndpointResponses({ ...defaultRecommendationResponses(), ...overrides });
}

export async function renderRecommendationLoading(overrides: Partial<RecommendationLoadingResponses>): Promise<ControllerResultRef> {
  installRecommendationFetchMock(overrides);
  return (await renderReadyController()).result;
}

export async function renderPendingBsiCatalog() {
  const catalog = deferred<Response>();
  const result = await renderRecommendationLoading({ "/api/recommendations/bsi": catalog.promise });
  await waitForRecommendationIndex(result);
  return { catalog, result };
}

export async function resolveRecommendationResponse(response: Deferred<Response>, body: unknown, status = 200): Promise<void> {
  await act(async () => { response.resolve(jsonResponse(body, status)); });
}

export async function waitForRecommendationIndex(result: ControllerResultRef): Promise<void> {
  await waitFor(() => { expect(currentReady(result).controller.recommendationIndex).toBeDefined(); });
}

export async function waitForRecommendationCatalog(result: ControllerResultRef, source: string): Promise<void> {
  await waitFor(() => { expect(currentReady(result).controller.recommendationCatalog?.source).toBe(source); });
}

function defaultRecommendationResponses(): RecommendationLoadingResponses {
  return {
    "/api/state": jsonResponse(createAppState()),
    "/api/recommendations": jsonResponse(createRecommendationIndex()),
    "/api/recommendations/bsi": jsonResponse(createRecommendationCatalog()),
    "/api/recommendations/vendor": jsonResponse(createRecommendationCatalog({ source: "vendor", label: "Vendor", displayPlatforms: ["ANDROID"] })),
    "/api/recommendations/cis": jsonResponse(createRecommendationCatalog({ source: "cis", label: "CIS" })),
  };
}
