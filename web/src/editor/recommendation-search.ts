// Supports recommendation editor views, filtering, and display metadata.
import type { BsiRecommendationRecord, CisRecommendationRecord, RecommendationImplementation, RecommendationRecord, RecommendationSource, VendorRecommendationRecord } from "../../../src/recommendation-types.js";
import { secondaryRecommendationId } from "./recommendation-record-utils.js";
import { ALL_ACHIEVABILITY, ALL_RECOMMENDATION_PLATFORMS, ALL_SURFACES } from "./recommendation-constants.js";
import { implementationOf } from "./recommendation-implementation.js";

export function matchesFilters(
  source: RecommendationSource,
  recommendation: RecommendationRecord,
  platform: string,
  query: string,
  achievability: string,
  surface: string,
): boolean {
  const implementation = implementationOf(recommendation);
  return matchesPlatform(recommendation, platform)
    && matchesImplementation(implementation, achievability, surface)
    && matchesQuery(source, recommendation, query);
}

function matchesPlatform(recommendation: RecommendationRecord, platform: string): boolean {
  return platform === ALL_RECOMMENDATION_PLATFORMS || recommendation.platform === platform;
}

function matchesImplementation(implementation: RecommendationImplementation, achievability: string, surface: string): boolean {
  return (achievability === ALL_ACHIEVABILITY || implementation.category === achievability)
    && (surface === ALL_SURFACES || implementation.surfaces.includes(surface as RecommendationImplementation["surfaces"][number]));
}

function matchesQuery(source: RecommendationSource, recommendation: RecommendationRecord, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery.length === 0 || recommendationSearchTerms(source, recommendation).some((value) => value.toLowerCase().includes(normalizedQuery));
}

function recommendationSearchTerms(source: RecommendationSource, recommendation: RecommendationRecord): string[] {
  const terms = [recommendation.title, recommendation.platform, secondaryRecommendationId(source, recommendation)];
  if (source === "bsi") {
    const item = recommendation as BsiRecommendationRecord;
    terms.push(item.moduleId, item.moduleTitle, ...(item.semanticConcepts ?? []).flatMap((concept) => [concept.id, concept.label.de, concept.label.en, concept.matchedTerms.join(" ")]));
  }
  if (source === "cis") {
    const item = recommendation as CisRecommendationRecord;
    terms.push(item.benchmarkTitle, item.benchmarkVersion);
  }
  if (source === "vendor") {
    const item = recommendation as VendorRecommendationRecord;
    terms.push(item.section, item.reason);
  }
  return terms;
}
