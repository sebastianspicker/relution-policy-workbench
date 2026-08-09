/** Provides the public compliance evaluation and remediation API. */
export { loadComplianceArtifacts } from "./compliance-artifacts.js";
import { buildComplianceReport as buildComplianceReportImplementation } from "./compliance-report.js";
import { applyComplianceRemediationToWorkspace as applyComplianceRemediationToWorkspaceImplementation } from "./compliance-remediation.js";
import type {
  ApplyComplianceRemediationInput,
  ApplyComplianceRemediationResult,
  BuildComplianceReportInput,
  ComplianceReport,
} from "./compliance-types.js";

export const buildComplianceReport: (input: BuildComplianceReportInput) => ComplianceReport = buildComplianceReportImplementation;
export const applyComplianceRemediationToWorkspace: (input: ApplyComplianceRemediationInput) => ApplyComplianceRemediationResult = applyComplianceRemediationToWorkspaceImplementation;

export type {
  ApplyComplianceRemediationInput,
  ApplyComplianceRemediationResult,
  BuildComplianceReportInput,
  ComplianceRecommendationResult,
  ComplianceReport,
  ComplianceSelection,
  ComplianceSourceCatalogs,
  ComplianceStatus,
} from "./compliance-types.js";
