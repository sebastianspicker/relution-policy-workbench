/** Composes archive and ruleset import action domains. */
import type { RecommendationCatalogResponse, RecommendationSource, RecommendationSourceSummary } from "../../../src/recommendation-types.js";
import type { PolicyWorkspace } from "../../../src/workspace.js";
import type { BaselineExpertApplyRuleset, BaselineTemplateClientSelection } from "./baseline-template-client.js";
import { createBaselineActions } from "./editor-baseline-actions.js";
import { buildArchive } from "./editor-build-action.js";
import { createFileImportActions } from "./editor-file-import-actions.js";
import { applyRulesetJson } from "./editor-ruleset-apply.js";
import { createRulesetImportActions } from "./editor-ruleset-import-actions.js";
import type { EditorActionStatus } from "./editor-workspace-mutation-actions.js";
import type { WorkspaceRequest, WorkspaceRequestGuard } from "./editor-workspace-request-guard.js";
import type { WorkspaceHistoryInput } from "./workspace-history.js";
import type { AppState, JsonRecord, RulesetImportReport, Selection } from "./types.js";

export type ImportBuildActionInput = {
  readonly currentState: AppState;
  readonly isDirty: boolean;
  readonly selection: Selection | undefined;
  readonly configuration: JsonRecord | undefined;
  readonly details: JsonRecord | undefined;
  readonly keyValue: string;
  readonly importFile: File | undefined;
  readonly jsonTemplateFile: File | undefined;
  readonly rulesetFile: File | undefined;
  readonly recommendationCatalog: RecommendationCatalogResponse | undefined;
  readonly recommendationSummary: RecommendationSourceSummary | undefined;
  readonly recommendationSource: RecommendationSource;
  readonly recommendationPlatform: string;
  readonly requestGuard: WorkspaceRequestGuard;
  readonly historyInput: WorkspaceHistoryInput;
  readonly persistWorkspace: (workspace: PolicyWorkspace, request: WorkspaceRequest) => Promise<unknown>;
  readonly updateSelectedConfiguration: (configuration: JsonRecord) => boolean;
  readonly setState: (update: (current: AppState | undefined) => AppState | undefined) => void;
  readonly setSelection: (selection: Selection | undefined) => void;
  readonly setIsDirty: (value: boolean) => void;
  readonly setHasFreshBuild: (value: boolean) => void;
  readonly setIsBuildLoading: (value: boolean) => void;
  readonly setSelectedType: (value: string) => void;
  readonly setInspectorTab: (value: "validation") => void;
  readonly setRulesetReport: (report: RulesetImportReport | undefined) => void;
  readonly setSelectedRecommendationId: (id: string | undefined) => void;
} & EditorActionStatus;

export function createImportBuildActions(input: ImportBuildActionInput): {
  readonly buildArchive: () => Promise<void>;
  readonly importArchive: () => Promise<void>;
  readonly importJsonTemplates: () => Promise<void>;
  readonly importRuleset: () => Promise<void>;
  readonly importRecommendationRuleset: () => Promise<void>;
  readonly applyBaselineTemplate: (template: BaselineTemplateClientSelection) => Promise<void>;
  readonly applyExpertBaselineSelection: (ruleset: BaselineExpertApplyRuleset) => Promise<void>;
} {
  const applyRuleset = (name: string, parsed: unknown, request: WorkspaceRequest) => applyRulesetJson(input, name, parsed, request);
  const baselineActions = createBaselineActions(input, applyRuleset);
  const fileImportActions = createFileImportActions(input);
  const rulesetImportActions = createRulesetImportActions(input, applyRuleset);
  return {
    buildArchive: () => buildArchive(input),
    importArchive: fileImportActions.importArchive,
    importJsonTemplates: fileImportActions.importJsonTemplates,
    importRuleset: rulesetImportActions.importRuleset,
    importRecommendationRuleset: rulesetImportActions.importRecommendationRuleset,
    applyBaselineTemplate: baselineActions.applyBaselineTemplate,
    applyExpertBaselineSelection: baselineActions.applyExpertBaselineSelection,
  };
}
