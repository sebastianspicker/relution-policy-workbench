/** Parses workspace, compliance, and recommendation request payloads. */
import { type ComplianceSelection } from "./compliance.js";
import { RECOMMENDATION_SOURCES, type RecommendationSource } from "./recommendation-types.js";
import { isRecommendationSource } from "./recommendations.js";
import { type PolicyWorkspace } from "./workspace.js";
import { badRequest, type JsonRecord } from "./editor-http-input.js";
import { optionalRecord, requireNumber, requireString } from "./editor-api-request-input.js";

export function parseWorkspaceBody(body: JsonRecord): PolicyWorkspace {
  const workspace = body.workspace;
  if (typeof workspace !== "object" || workspace === null || Array.isArray(workspace)) {
    throw badRequest("Expected workspace object");
  }
  return workspace as PolicyWorkspace;
}

export function parseComplianceSelectionBody(body: JsonRecord): ComplianceSelection {
  const selection = optionalRecord(body, "selection");
  if (selection === undefined) throw badRequest("Expected selection object");
  return { policyIndex: requireNumber(selection, "policyIndex"), versionIndex: requireNumber(selection, "versionIndex") };
}

export function parseRecommendationSourcesBody(body: JsonRecord): RecommendationSource[] {
  const rawSources = body.sources;
  if (rawSources === undefined) return [...RECOMMENDATION_SOURCES];
  if (!Array.isArray(rawSources)) throw badRequest("Expected sources array");
  const sources = rawSources.map(parseRecommendationSource);
  if (sources.length === 0) throw badRequest("At least one recommendation source is required");
  return [...new Set(sources)];
}

export function parseRecommendationSourceBody(body: JsonRecord): RecommendationSource {
  return parseRecommendationSource(requireString(body, "source"));
}

function parseRecommendationSource(value: unknown): RecommendationSource {
  if (typeof value !== "string" || !isRecommendationSource(value)) {
    throw badRequest(`Unknown recommendation source: ${String(value)}`);
  }
  return value;
}
