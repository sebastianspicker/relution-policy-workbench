// Supports recommendation editor views, filtering, and display metadata.
import type { RecommendationScope } from "./recommendation-view.js";

export const ALL_RECOMMENDATION_PLATFORMS = "ALL";
export const ALL_ACHIEVABILITY = "ALL";
export const ALL_SURFACES = "ALL";
export const RECOMMENDATION_SCOPE_ACTIONABLE: RecommendationScope = "actionable-settings";
export const RECOMMENDATION_SCOPE_WITHOUT_SETTINGS: RecommendationScope = "recommendations-without-settings";
export const RECOMMENDATION_SCOPE_ALL: RecommendationScope = "all-recommendations";
