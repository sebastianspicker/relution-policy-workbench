/** Declares the data contract for compliance evaluation reports. */
import type { AppleSchemaCatalog } from "./apple-schema.js";
import type { ComplianceRemediationOption } from "./compliance-remediation-types.js";
import type {
  RecommendationCatalogResponse,
  RecommendationRecord,
  RecommendationRulesetMapping,
  RecommendationSettingBundleCatalog,
  RecommendationSource,
} from "./recommendation-types.js";
import type { RelutionTemplateBundle } from "./templates.js";
import type { PolicyWorkspace } from "./workspace.js";
import type { JsonRecord as WorkspaceJsonRecord } from "./utils/json-guards.js";

export type JsonRecord = WorkspaceJsonRecord;

export type ComplianceStatus = "compliant" | "exact-gap" | "choice-required" | "parameter-required" | "not-checkable";
type ComplianceMappingStatus = "compliant" | "missing" | "mismatch" | "ambiguous" | "unsupported";

export interface ComplianceSelection {
  policyIndex: number;
  versionIndex: number;
}

export interface ComplianceSourceCatalogs {
  recommendationCatalog: RecommendationCatalogResponse;
  /** Optional source-specific setting bundles used when remediation can import a concrete Relution setting. */
  settingBundleCatalog?: RecommendationSettingBundleCatalog;
  settingBundleCatalogError?: string;
}

type ComplianceArtifactState = "loaded" | "degraded" | "unavailable";

export interface ComplianceSourceStatus {
  source: RecommendationSource;
  recommendationCatalog: ComplianceArtifactState;
  settingBundleCatalog: ComplianceArtifactState;
  warnings: string[];
}

export interface ComplianceConfigurationReference {
  configurationIndex: number;
  type: string;
  label: string;
  schemaId?: string;
  payloadType?: string;
}

export interface ComplianceMappingResult {
  kind: RecommendationRulesetMapping["kind"];
  target: string;
  expectedValues: JsonRecord;
  status: ComplianceMappingStatus;
  matchingConfigurations: ComplianceConfigurationReference[];
  candidateConfigurations: ComplianceConfigurationReference[];
}

export interface ComplianceRecommendationResult {
  id: string;
  source: RecommendationSource;
  recommendationId: string;
  recommendation: RecommendationRecord;
  status: ComplianceStatus;
  mappingResults: ComplianceMappingResult[];
  matchedConfigurations: ComplianceConfigurationReference[];
  blockingReasons: string[];
  remediationOptions: ComplianceRemediationOption[];
}

export interface ComplianceReport {
  policyPath: string;
  policyName: string;
  policyPlatform: string;
  versionIndex: number;
  sources: RecommendationSource[];
  sourceStatuses?: ComplianceSourceStatus[];
  warnings?: string[];
  results: ComplianceRecommendationResult[];
  summary: {
    totalRecommendations: number;
    byStatus: Record<ComplianceStatus, number>;
  };
}

export interface BuildComplianceReportInput {
  workspace: PolicyWorkspace;
  selection: ComplianceSelection;
  sources: RecommendationSource[];
  catalogs: Partial<Record<RecommendationSource, ComplianceSourceCatalogs>>;
  bundle: RelutionTemplateBundle;
  appleSchema: AppleSchemaCatalog;
}
