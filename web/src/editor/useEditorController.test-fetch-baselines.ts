/** Baseline template routes for the controller fetch double. */
import { createBaselineExpertOptions, createBaselineRuleset, createBaselineTemplateOptions } from "./baseline-test-fixtures.js";
import { jsonResponse } from "./useEditorController.test-core.js";
import type { FetchMockOptions } from "./useEditorController.test-fetch-types.js";

export function baselineTemplateResponse(url: string, options: FetchMockOptions): Response | undefined {
  if (url === "/api/baseline-templates") return jsonResponse(options.baselineTemplates?.index ?? createBaselineTemplateOptions());
  if (url.startsWith("/api/baseline-templates/template")) return jsonResponse(options.baselineTemplates?.template ?? createBaselineRuleset());
  if (url.startsWith("/api/baseline-templates/expert")) return jsonResponse(options.baselineTemplates?.expert ?? createBaselineExpertOptions());
  return undefined;
}
