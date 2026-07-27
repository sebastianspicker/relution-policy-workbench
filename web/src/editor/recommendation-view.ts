// Supports recommendation editor views, filtering, and display metadata.
import type { RecommendationRecord, RecommendationSourceSummary } from "../../../src/recommendation-types.js";
import { uniqueStrings } from "../../../src/utils/json-guards.js";
import type { EditorController } from "./types.js";
import { effectiveScope, matchesScope } from "./recommendation-filtering.js";
import { matchesFilters } from "./recommendation-search.js";
import { implementationOf } from "./recommendation-implementation.js";
import { summarizeCoverage } from "./recommendation-view-metadata.js";

export type RecommendationScope = "actionable-settings" | "recommendations-without-settings" | "all-recommendations";

export interface CoverageSummary {
  readonly exactMappings: number;
  readonly actionableRecommendations: number;
  readonly partialRecommendations: number;
  readonly helperOnlyRecommendations: number;
  readonly gapRecommendations: number;
}

export interface RecommendationViewState {
  readonly availableCategories: readonly string[];
  readonly availableSurfaces: readonly string[];
  readonly effectiveRecommendationScope: RecommendationScope;
  readonly filteredCoverage: CoverageSummary;
  readonly filteredRecommendations: RecommendationRecord[];
  readonly scopedRecommendations: RecommendationRecord[];
  readonly selectedRecommendation: RecommendationRecord | undefined;
  readonly sourceCoverage: CoverageSummary;
  readonly sources: readonly RecommendationSourceSummary[];
  readonly summary: RecommendationSourceSummary | undefined;
}

export function recommendationViewState(
  controller: EditorController,
  recommendationScope: RecommendationScope,
  achievabilityFilter: string,
  surfaceFilter: string,
): RecommendationViewState {
  const catalogRecommendations = controller.recommendationCatalog?.recommendations ?? [];
  const effectiveRecommendationScope = effectiveScope(catalogRecommendations, recommendationScope);
  const scopedRecommendations = catalogRecommendations.filter((recommendation) => matchesScope(recommendation, effectiveRecommendationScope));
  const filteredRecommendations = scopedRecommendations.filter((recommendation) => matchesFilters(controller.recommendationSource, recommendation, controller.recommendationPlatform, controller.recommendationQuery, achievabilityFilter, surfaceFilter));
  const summary = controller.recommendationIndex?.sources.find((candidate) => candidate.source === controller.recommendationSource);
  return {
    availableCategories: [...new Set(catalogRecommendations.map((recommendation) => implementationOf(recommendation).category))].sort(),
    availableSurfaces: uniqueStrings(catalogRecommendations.flatMap((recommendation) => implementationOf(recommendation).surfaces), { sort: true }),
    effectiveRecommendationScope, filteredCoverage: summarizeCoverage(filteredRecommendations), filteredRecommendations, scopedRecommendations,
    selectedRecommendation: filteredRecommendations.find((recommendation) => recommendation.id === controller.selectedRecommendationId),
    sourceCoverage: summary?.coverageSummary ?? summarizeCoverage(catalogRecommendations), sources: controller.recommendationIndex?.sources ?? [], summary,
  };
}
