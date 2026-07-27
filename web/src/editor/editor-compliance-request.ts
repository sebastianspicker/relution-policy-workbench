/** Sends the debounced compliance refresh request and validates its response. */
import type { ComplianceReport } from "../../../src/compliance.js";
import type { RecommendationSource } from "../../../src/recommendation-types.js";
import type { PolicyWorkspace } from "../../../src/workspace.js";
import { postJson, readJsonResponse } from "./editor-utils.js";
import type { JsonRecord, Selection } from "./types.js";

export async function requestComplianceReport(
  workspace: PolicyWorkspace,
  selection: Selection,
  sources: RecommendationSource[],
): Promise<ComplianceReport> {
  const response = await postJson("/api/compliance/check", {
    workspace,
    selection: {
      policyIndex: selection.policyIndex,
      versionIndex: selection.versionIndex,
    },
    sources,
  });
  const result = await readJsonResponse<{ report?: ComplianceReport } & JsonRecord>(response);
  if (!response.ok || result.report === undefined) throw new Error(JSON.stringify(result));
  return result.report;
}
