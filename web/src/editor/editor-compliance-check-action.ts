/** Implements an explicit compliance refresh action. */
import type { ComplianceReport } from "../../../src/compliance.js";
import { finishComplianceRequest, reportComplianceRequestFailure, type ComplianceActionsInput } from "./editor-compliance-action-runtime.js";
import { postJson, readJsonResponse } from "./editor-utils.js";
import { beginExplicitComplianceActivity } from "./editor-workspace-request-activity.js";
import type { JsonRecord } from "./types.js";

export function createComplianceCheckAction(input: ComplianceActionsInput): () => Promise<void> {
  return async function refreshCompliance(): Promise<void> {
    if (input.selection === undefined) {
      input.setActionErrorStatus("Select a policy before checking compliance");
      return;
    }
    if (!input.requestGuard.canEditWorkspace()) {
      input.setActionErrorStatus("A server workspace mutation is in progress");
      return;
    }
    const request = input.requestGuard.begin();
    const activity = beginExplicitComplianceActivity(input.setComplianceLoading);
    try {
      input.setComplianceLoading(true);
      input.setComplianceError(undefined);
      const response = await postJson("/api/compliance/check", {
        workspace: input.currentState.workspace,
        selection: { policyIndex: input.selection.policyIndex, versionIndex: input.selection.versionIndex },
        sources: input.complianceSources,
      });
      const result = await readJsonResponse<{ report?: ComplianceReport } & JsonRecord>(response);
      if (!input.requestGuard.isCurrent(request)) return;
      if (!response.ok || result.report === undefined) {
        input.setActionErrorStatus(`Compliance check failed: ${JSON.stringify(result)}`);
        return;
      }
      input.setComplianceReportForWorkspace(result.report, input.currentState.workspace);
      input.setActionSuccessStatus("Checked compliance");
    } catch (error) {
      reportComplianceRequestFailure(input, () => input.requestGuard.isCurrent(request), "check", error);
    } finally {
      finishComplianceRequest(input, activity);
    }
  };
}
