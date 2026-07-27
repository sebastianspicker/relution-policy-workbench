/** Serves recommendation catalogs and their derived analyses. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./editor-routes-utils.js";
import {
  isRecommendationSource,
  listRecommendationCatalogs,
  loadRecommendationCatalog,
  loadRecommendationCoverage,
  loadRecommendationSemanticIndex,
  loadUnifiedRecommendationAnalysis,
} from "./recommendations.js";

export function handleRecommendationApiRequest(url: URL, _request: IncomingMessage, response: ServerResponse): boolean {
  if (url.pathname === "/api/recommendations") {
    sendJson(response, 200, listRecommendationCatalogs());
    return true;
  }
  if (url.pathname === "/api/recommendations/coverage") {
    sendJson(response, 200, loadRecommendationCoverage());
    return true;
  }
  if (url.pathname === "/api/recommendations/semantics") {
    sendJson(response, 200, loadRecommendationSemanticIndex());
    return true;
  }
  if (url.pathname === "/api/recommendations/semantic-analysis") {
    sendJson(response, 200, loadUnifiedRecommendationAnalysis());
    return true;
  }
  if (!url.pathname.startsWith("/api/recommendations/")) return false;
  const source = url.pathname.slice("/api/recommendations/".length);
  if (!isRecommendationSource(source)) {
    sendJson(response, 404, { error: `Unknown recommendation source: ${source}` });
    return true;
  }
  sendJson(response, 200, loadRecommendationCatalog(source));
  return true;
}
