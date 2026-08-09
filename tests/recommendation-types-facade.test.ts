/** Locks the public recommendation facade's compatibility surface. */
import assert from "node:assert/strict";
import test from "node:test";
import * as recommendationTypes from "../src/recommendation-types.js";
import { RECOMMENDATION_SOURCES as sourceTuple } from "../src/recommendation-sources.js";
import type {
  BsiRecommendationRecord,
  CisRecommendationRecord,
  RecommendationCatalogResponse,
  RecommendationCoverageMatrix,
  RecommendationFallbackTranslation,
  RecommendationImplementation,
  RecommendationImplementationCategory,
  RecommendationImplementationSurface,
  RecommendationIndexResponse,
  RecommendationRecord,
  RecommendationRuleset,
  RecommendationRulesetMapping,
  RecommendationSemanticIndex,
  RecommendationSettingBundle,
  RecommendationSettingBundleCatalog,
  RecommendationSource,
  RecommendationSourceCoverageSummary,
  RecommendationSourceSummary,
  RecommendationUnifiedAnalysis,
  VendorRecommendationRecord,
} from "../src/recommendation-types.js";

type RecommendationPublicContracts = [
  BsiRecommendationRecord,
  CisRecommendationRecord,
  RecommendationCatalogResponse,
  RecommendationCoverageMatrix,
  RecommendationFallbackTranslation,
  RecommendationImplementation,
  RecommendationImplementationCategory,
  RecommendationImplementationSurface,
  RecommendationIndexResponse,
  RecommendationRecord,
  RecommendationRuleset,
  RecommendationRulesetMapping,
  RecommendationSemanticIndex,
  RecommendationSettingBundle,
  RecommendationSettingBundleCatalog,
  RecommendationSource,
  RecommendationSourceCoverageSummary,
  RecommendationSourceSummary,
  RecommendationUnifiedAnalysis,
  VendorRecommendationRecord,
];

test("retains the public recommendation contracts and source tuple facade", () => {
  const contracts: RecommendationPublicContracts | undefined = undefined;

  assert.equal(contracts, undefined);
  assert.deepEqual(Object.keys(recommendationTypes), ["RECOMMENDATION_SOURCES"]);
  assert.deepEqual(recommendationTypes.RECOMMENDATION_SOURCES, ["bsi", "vendor", "cis"]);
  assert.strictEqual(recommendationTypes.RECOMMENDATION_SOURCES, sourceTuple);
});
