// Supports recommendation editor views, filtering, and display metadata.
import type { RecommendationImplementation, RecommendationRecord } from "../../../src/recommendation-types.js";
import { uniqueStrings } from "../../../src/utils/json-guards.js";

export function implementationOf(recommendation: RecommendationRecord): RecommendationImplementation {
  if (recommendation.implementation !== undefined) {
    return recommendation.implementation;
  }
  const fallbackTranslations = recommendation.fallbackTranslations ?? [];
  const surfaces = uniqueStrings([
    ...recommendation.relutionMapping.candidates.map((candidate) => candidate.kind),
    ...recommendation.relutionMapping.rulesetMappings.map((mapping) => mapping.kind),
    ...(fallbackTranslations.length > 0 ? ["helper"] : []),
  ], { sort: true }) as RecommendationImplementation["surfaces"];
  return inferredImplementation(recommendation, surfaces, fallbackTranslations.length > 0);
}

function inferredImplementation(
  recommendation: RecommendationRecord,
  surfaces: RecommendationImplementation["surfaces"],
  hasFallbackTranslations: boolean,
): RecommendationImplementation {
  const { relutionMapping } = recommendation;
  if (relutionMapping.status === "exact") {
    return {
      category: "relution-achievable",
      surfaces,
      importableVia: relutionMapping.rulesetMappings.some((mapping) => mapping.kind === "relution-native")
        ? ["apply-json", "ruleset-import"]
        : ["ruleset-import"],
      blockingReasons: relutionMapping.notes,
    };
  }
  return nonExactImplementation(recommendation, surfaces, hasFallbackTranslations);
}

function nonExactImplementation(
  recommendation: RecommendationRecord,
  surfaces: RecommendationImplementation["surfaces"],
  hasFallbackTranslations: boolean,
): RecommendationImplementation {
  const category = recommendation.relutionMapping.candidates.length > 0
    ? "relution-partial"
    : hasFallbackTranslations
      ? "helper-only"
      : "gap";
  return { category, surfaces, importableVia: [], blockingReasons: recommendation.relutionMapping.notes };
}

export function importabilityLabel(implementation: RecommendationImplementation): string {
  return implementation.importableVia.length === 0 ? "Info only" : `Importable via ${implementation.importableVia.join(", ")}`;
}

export function categoryLabel(category: string): string {
  return ({
    "relution-achievable": "Achievable",
    "relution-partial": "Partial",
    "helper-only": "Helper only",
    gap: "Gap",
  } as Record<string, string>)[category] ?? category;
}

export function surfaceLabel(surface: string): string {
  return ({
    "relution-native": "Native",
    "apple-mobileconfig": "Apple mobileconfig",
    "apple-schema-profile": "Apple schema",
    helper: "Helper",
  } as Record<string, string>)[surface] ?? surface;
}
