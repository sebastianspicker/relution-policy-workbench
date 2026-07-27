/** Shared state and request-lifecycle contract for compliance controller actions. */
import type { SetStateAction } from "react";
import type { ComplianceReport } from "../../../src/compliance.js";
import type { RecommendationSource } from "../../../src/recommendation-types.js";
import type { PolicyWorkspace } from "../../../src/workspace.js";
import { finishExplicitComplianceActivity, type beginExplicitComplianceActivity } from "./editor-workspace-request-activity.js";
import type { WorkspaceHistoryInput } from "./workspace-history.js";
import type { EditorActionStatus } from "./editor-workspace-mutation-actions.js";
import type { WorkspaceRequestGuard } from "./editor-workspace-request-guard.js";
import type { AppState, Selection } from "./types.js";
import { reportEditorActionFailure } from "./editor-action-failure.js";

export type ComplianceActionsInput = {
  readonly currentState: AppState;
  readonly selection: Selection | undefined;
  readonly complianceSources: RecommendationSource[];
  readonly complianceReport: ComplianceReport | undefined;
  readonly requestGuard: WorkspaceRequestGuard;
  readonly historyInput: WorkspaceHistoryInput;
  readonly setState: (state: SetStateAction<AppState | undefined>) => void;
  readonly setIsDirty: (value: boolean) => void;
  readonly setHasFreshBuild: (value: boolean) => void;
  readonly setComplianceLoading: (value: boolean) => void;
  readonly setComplianceError: (value: string | undefined) => void;
  readonly setComplianceReportForWorkspace: (report: ComplianceReport, workspace: PolicyWorkspace) => void;
} & EditorActionStatus;

export function reportComplianceRequestFailure(
  input: ComplianceActionsInput,
  isCurrent: () => boolean,
  action: "check" | "remediation",
  error: unknown,
): void {
  if (!isCurrent()) return;
  reportEditorActionFailure(input, `Compliance ${action} failed`, error);
}

export function finishComplianceRequest(
  input: ComplianceActionsInput,
  activity: ReturnType<typeof beginExplicitComplianceActivity>,
): void {
  if (finishExplicitComplianceActivity(input.setComplianceLoading, activity)) {
    input.setComplianceLoading(false);
  }
}
