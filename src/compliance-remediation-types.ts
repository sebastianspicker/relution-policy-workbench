/** Declares remediation options and report-driven workspace application contracts. */
import type {
  BuildComplianceReportInput,
  ComplianceReport,
} from "./compliance-report-types.js";
import type { RecommendationImplementationSurface, RecommendationSource } from "./recommendation-types.js";
import type { PolicyWorkspace } from "./workspace.js";

export interface ComplianceRemediationOption {
  id: string;
  kind: "native-bundle" | "exact-recommendation";
  label: string;
  surfaces: RecommendationImplementationSurface[];
  coveredRecommendationIds: string[];
  available?: boolean;
  unavailableReason?: string;
  bundleId?: string;
  targetType?: string;
  schemaId?: string;
  payloadType?: string;
  variantId?: string;
}

export interface ApplyComplianceRemediationInput extends BuildComplianceReportInput {
  source: RecommendationSource;
  recommendationId: string;
  remediationId: string;
}

export interface ApplyComplianceRemediationResult {
  workspace: PolicyWorkspace;
  report: ComplianceReport;
  appliedRemediation: ComplianceRemediationOption;
}
