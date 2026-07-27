/** Fresh controller doubles for component tests. */
import { vi } from "vitest";
import { createAppState } from "./useEditorController.test-fixtures.js";
import type { EditorController } from "./types.js";

const ACTION_NAMES = [
  "setSelection", "setRawJson", "resetRawJson", "setSelectedType", "setAddQuery", "setAddGroup", "setInspectorTab", "setNewPolicyPlatform", "setNewPolicyName", "setKeyValue", "setImportFile", "setJsonTemplateFile", "setRulesetFile", "setStatus", "setRecommendationSource", "setRecommendationQuery", "setRecommendationPlatform", "setSelectedRecommendationId", "toggleComplianceSource", "setDdmSchemaId", "setMdmCommandSchemaId", "saveWorkspace", "addConfiguration", "addPolicy", "removeConfiguration", "moveConfiguration", "buildArchive", "setActiveKey", "importArchive", "importJsonTemplates", "importRuleset", "importRecommendationRuleset", "refreshCompliance", "applyComplianceRemediation", "addDdmArtifact", "addMdmCommandArtifact", "reconcileSidecar", "removeDdmArtifact", "removeMdmCommandArtifact", "updateDdmArtifact", "updateMdmCommandArtifact", "renameSelectedPolicy", "updateSelectedPolicyDescription", "duplicateSelectedPolicy", "deleteSelectedPolicy", "clearWorkspace", "undoWorkspace", "redoWorkspace", "applyBaselineTemplate", "applyExpertBaselineSelection", "updateSelectedConfiguration", "applyRawJson",
] as const satisfies readonly (keyof EditorController)[];

function createActionMocks(): Partial<EditorController> {
  return Object.fromEntries(ACTION_NAMES.map((name) => [name, vi.fn()])) as Partial<EditorController>;
}

export function createEditorControllerStub(overrides: Partial<EditorController> = {}): EditorController {
  return {
    state: createAppState(), selection: undefined, rawJson: "", rawJsonDirty: false, selectedType: "", addQuery: "", addGroup: "all", inspectorTab: "validation", newPolicyPlatform: "IOS", newPolicyName: "", keyValue: "", status: "", lastActionResult: undefined, isDirty: false, isBuildLoading: false, hasFreshBuild: false, canUndo: false, canRedo: false, rulesetReport: undefined,
    recommendationIndex: undefined, recommendationCatalog: undefined, recommendationSource: "bsi", recommendationQuery: "", recommendationPlatform: "ALL", selectedRecommendationId: undefined, recommendationsLoading: false, recommendationsError: undefined, complianceSources: ["bsi", "vendor", "cis"], complianceReport: undefined, complianceLoading: false, complianceError: undefined,
    ddmSchemaId: "", mdmCommandSchemaId: "", policy: undefined, configuration: undefined, details: undefined, templatesByType: new Map(), template: undefined, appleCompatSetting: undefined, appleSchemaProfile: undefined, creatablePlatforms: ["IOS"], availableTemplates: [], presentNativeTypes: [], availableAppleCompatSettings: [], availableAppleSchemaProfiles: [], availableDdmEntries: [], availableMdmCommands: [],
    ...createActionMocks(), ...overrides,
  } as EditorController;
}
