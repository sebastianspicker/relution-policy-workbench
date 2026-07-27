/** Shared state contracts for compliance refresh and controller publication. */
import type { Dispatch, SetStateAction } from "react";
import type { ComplianceReport } from "../../../src/compliance.js";
import type { RecommendationSource } from "../../../src/recommendation-types.js";
import type { PolicyWorkspace } from "../../../src/workspace.js";
import type { AppState, Selection } from "./types.js";

export interface ComplianceReportState {
  readonly report: ComplianceReport;
  readonly workspace: PolicyWorkspace;
}

export interface ComplianceStateSetters {
  readonly setComplianceSources: Dispatch<SetStateAction<RecommendationSource[]>>;
  readonly setComplianceReportForWorkspace: (report: ComplianceReport, workspace: PolicyWorkspace) => void;
  readonly setComplianceLoading: Dispatch<SetStateAction<boolean>>;
  readonly setComplianceError: Dispatch<SetStateAction<string | undefined>>;
}

export interface ComplianceRefreshProps {
  readonly complianceSources: RecommendationSource[];
  readonly selection: Selection | undefined;
  readonly setComplianceError: Dispatch<SetStateAction<string | undefined>>;
  readonly setComplianceLoading: Dispatch<SetStateAction<boolean>>;
  readonly setComplianceReportState: Dispatch<SetStateAction<ComplianceReportState | undefined>>;
  readonly state: AppState | undefined;
}
