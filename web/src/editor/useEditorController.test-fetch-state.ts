/** Workspace, key, and compliance routes for the fetch double. */
import { jsonResponse } from "./useEditorController.test-core.js";
import { createComplianceReport } from "./useEditorController.test-recommendation-fixtures.js";
import type { FetchMockOptions } from "./useEditorController.test-fetch-types.js";
import type { AppState } from "./types.js";

export function stateFetchResponse(url: string, state: AppState, options: FetchMockOptions): Response | undefined {
  if (url === "/api/state") return jsonResponse(state);
  if (url === "/api/key") return jsonResponse(options.keyResult ?? { keySet: true, validated: false }, options.keyStatus ?? 200);
  if (url === "/api/import") return jsonResponse({ workspace: state.workspace, validation: state.validation, keySet: state.keySet, sidecar: state.sidecar });
  if (url === "/api/workspace") return jsonResponse({ workspace: state.workspace, validation: state.validation }, options.workspaceStatus ?? 200);
  if (url !== "/api/workspace/validate") return undefined;
  if (options.workspaceValidateError !== undefined) throw options.workspaceValidateError;
  return jsonResponse({ validation: state.validation }, options.workspaceValidateStatus ?? 200);
}

export function complianceFetchResponse(url: string, state: AppState, options: FetchMockOptions): Response | undefined {
  if (url === "/api/compliance/check") return jsonResponse({ report: options.complianceReport ?? createComplianceReport() });
  if (url !== "/api/compliance/apply") return undefined;
  return jsonResponse(options.complianceApply ?? { workspace: state.workspace, validation: state.validation, sidecar: state.sidecar, report: createComplianceReport({ results: [], summary: { totalRecommendations: 0, byStatus: { compliant: 0, "exact-gap": 0, "choice-required": 0, "parameter-required": 0, "not-checkable": 0 } } }) }, options.complianceApplyStatus ?? 200);
}
