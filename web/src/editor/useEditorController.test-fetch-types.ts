/** Types shared by the deterministic controller fetch double. */
import type { BaselineExpertOptionsResponse, BaselineTemplateOptionsResponse } from "../../../src/baseline-templates.js";
import type { RecommendationCatalogResponse, RecommendationIndexResponse } from "../../../src/recommendation-types.js";

export interface FetchRequestRecord {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

export interface FetchMockOptions {
  recommendationIndex?: RecommendationIndexResponse;
  recommendationCatalogs?: Partial<Record<"bsi" | "vendor" | "cis", RecommendationCatalogResponse>>;
  complianceReport?: Record<string, unknown>;
  complianceApply?: Record<string, unknown>;
  complianceApplyStatus?: number;
  buildResult?: Record<string, unknown>;
  buildStatus?: number;
  buildError?: Error;
  keyResult?: Record<string, unknown>;
  keyStatus?: number;
  workspaceStatus?: number;
  workspaceValidateStatus?: number;
  workspaceValidateError?: Error;
  sidecarResponses?: Record<string, Record<string, unknown>>;
  baselineTemplates?: {
    readonly index?: BaselineTemplateOptionsResponse;
    readonly template?: unknown;
    readonly expert?: BaselineExpertOptionsResponse;
  };
}

export type MockFetchResponse =
  | { readonly kind: "handled"; readonly response: Response }
  | { readonly kind: "build-error"; readonly error: Error }
  | { readonly kind: "unhandled" };
