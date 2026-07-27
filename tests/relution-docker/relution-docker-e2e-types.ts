// Supports Relution Docker end-to-end test scenarios and helpers.
export interface BaselineTemplateIndex {
  consolidatedTemplates: BaselineTemplateIndexEntry[];
  modularBundleTemplates: BaselineTemplateIndexEntry[];
  modularTemplates: BaselineTemplateIndexEntry[];
  tieredConsolidatedTemplates: BaselineTemplateIndexEntry[];
  tieredModularBundleTemplates: BaselineTemplateIndexEntry[];
  tieredModularTemplates: BaselineTemplateIndexEntry[];
}

export interface BaselineTemplateIndexEntry {
  path: string;
  platform: string;
  tier?: 1 | 2 | 3;
}

export interface BaselineTemplate {
  name: string;
  policies: BaselinePolicy[];
}

export interface BaselinePolicy {
  name: string;
  rules: BaselineRule[];
}

interface BaselineRule {
  mappings?: BaselineMapping[];
}

type BaselineMapping =
  | { kind: "relution-native"; type: string }
  | { kind: "apple-mobileconfig"; payloadType: string }
  | { kind: "apple-schema-profile"; schemaId: string };

export interface PolicyImportReport {
  importedPolicies?: Record<string, PolicyImportReportEntry>;
  failedPolicies?: Record<string, PolicyImportReportEntry>;
  errors?: string[];
  warnings?: string[];
}

export interface PolicyImportReportEntry {
  policyUuid?: string;
  policyName?: string;
  result?: string;
  errors?: string[];
  warnings?: string[];
}

export interface PolicyVersionWrapper {
  results?: PolicyVersion[];
}

export interface PolicyVersion {
  uuid?: string;
  name?: string;
  state?: string;
  configurations?: PolicyConfiguration[];
}

export interface PolicyConfigurationWrapper {
  results?: PolicyConfiguration[];
}

export interface PolicyConfiguration {
  uuid?: string;
  details?: {
    type?: string;
    rawContent?: string;
    secondLevelPayloadType?: string;
  };
}
