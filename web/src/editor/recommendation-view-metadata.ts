// Supports recommendation editor views, filtering, and display metadata.
import type { RecommendationRecord } from "../../../src/recommendation-types.js";
import type { EditorController } from "./types.js";
import { ALL_RECOMMENDATION_PLATFORMS, RECOMMENDATION_SCOPE_ACTIONABLE, RECOMMENDATION_SCOPE_ALL } from "./recommendation-constants.js";
import { implementationOf } from "./recommendation-implementation.js";
import type { CoverageSummary, RecommendationScope } from "./recommendation-view.js";

export function canImportRuleset(catalog: EditorController["recommendationCatalog"], platform: string): boolean {
  if (catalog?.ruleset === undefined) return false;
  const importPlatform = platform === ALL_RECOMMENDATION_PLATFORMS ? undefined : catalog.displayToImportPlatform[platform];
  if (platform !== ALL_RECOMMENDATION_PLATFORMS && importPlatform === undefined) return false;
  return catalog.ruleset.policies.some((policy) => (importPlatform === undefined || policy.platform === importPlatform)
    && policy.rules.some((rule) => rule.informational !== true && (rule.mappings?.length ?? 0) > 0));
}

export function scopeLabel(scope: RecommendationScope): string {
  return scope === RECOMMENDATION_SCOPE_ACTIONABLE ? "actionable settings" : scope === RECOMMENDATION_SCOPE_ALL ? "all recommendations" : "recommendations without settings";
}

export function summarizeCoverage(recommendations: readonly RecommendationRecord[]): CoverageSummary {
  return recommendations.reduce<CoverageSummary>((counts, recommendation) => addCoverageCount(counts, recommendation), emptyCoverageSummary());
}

function addCoverageCount(counts: CoverageSummary, recommendation: RecommendationRecord): CoverageSummary {
  const category = implementationOf(recommendation).category;
  return {
    exactMappings: counts.exactMappings + Number(recommendation.relutionMapping.status === "exact"),
    actionableRecommendations: counts.actionableRecommendations + Number(category === "relution-achievable"),
    partialRecommendations: counts.partialRecommendations + Number(category === "relution-partial"),
    helperOnlyRecommendations: counts.helperOnlyRecommendations + Number(category === "helper-only"),
    gapRecommendations: counts.gapRecommendations + Number(category === "gap"),
  };
}

function emptyCoverageSummary(): CoverageSummary {
  return { exactMappings: 0, actionableRecommendations: 0, partialRecommendations: 0, helperOnlyRecommendations: 0, gapRecommendations: 0 };
}
