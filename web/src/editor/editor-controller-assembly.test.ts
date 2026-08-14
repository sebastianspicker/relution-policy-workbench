/** Verifies pure controller action assembly and ready-state projection. */
import { describe, expect, it, vi } from "vitest";
import {
  createEditorControllerActionInput,
  projectReadyEditorController,
  type EditorControllerAssemblyInput,
} from "./editor-controller-assembly.js";
import type { EditorControllerActions } from "./useEditorControllerActionTypes.js";
import type { EditorComplianceState } from "./useEditorComplianceState.js";
import type { EditorRecommendationState } from "./useEditorRecommendationState.js";
import type { EditorWorkspaceState } from "./useEditorWorkspaceState.js";
import { createAppState } from "./useEditorController.test-helpers.js";

function createAssemblyInput(): EditorControllerAssemblyInput {
  const currentState = createAppState();
  const workspace = {
    isDirty: true,
    selection: { policyIndex: 0, versionIndex: 0 },
    canonicalRawJson: '{"canonical":true}',
    rawJson: '{"draft":true}',
    selectedType: "IOS_PASSCODE",
    newPolicyPlatform: "IOS",
    newPolicyName: "Passcode",
    keyValue: "passphrase",
    ddmSchemaId: "ddm-schema",
    mdmCommandSchemaId: "command-schema",
    undoStack: [{}],
    redoStack: [],
    setState: vi.fn(),
    setSelection: vi.fn(),
    setRawJsonState: vi.fn(),
    setRawJsonDirty: vi.fn(),
    setSelectedType: vi.fn(),
    setNewPolicyName: vi.fn(),
    setStatus: vi.fn(),
    setLastActionResult: vi.fn(),
    setIsDirty: vi.fn(),
    setHasFreshBuild: vi.fn(),
    setRulesetReport: vi.fn(),
    setInspectorTab: vi.fn(),
    setIsBuildLoading: vi.fn(),
    setUndoStack: vi.fn(),
    setRedoStack: vi.fn(),
  } as unknown as EditorWorkspaceState;
  const recommendations = {
    recommendationSource: "bsi",
    recommendationPlatform: "IOS",
    setSelectedRecommendationId: vi.fn(),
    setRecommendationSourceState: vi.fn(),
    setRecommendationPlatform: vi.fn(),
    setRecommendationQuery: vi.fn(),
  } as unknown as EditorRecommendationState;
  const compliance = {
    complianceSources: ["bsi"],
    setComplianceSources: vi.fn(),
    setComplianceReportForWorkspace: vi.fn(),
    setComplianceLoading: vi.fn(),
    setComplianceError: vi.fn(),
  } as unknown as EditorComplianceState;
  return { currentState, workspace, recommendations, compliance };
}

describe("editor controller assembly", () => {
  it("preserves action dependencies and publishes ready state with derived history flags", () => {
    const input = createAssemblyInput();
    const actionInput = createEditorControllerActionInput(input);
    const actions = { setRawJson: vi.fn() } as unknown as EditorControllerActions;

    expect(actionInput.workspace.currentState).toBe(input.currentState);
    expect(actionInput.workspace.canonicalRawJson).toBe(input.workspace.canonicalRawJson);
    expect(actionInput.workspaceSetters.setState).toBe(input.workspace.setState);
    expect(actionInput.recommendationSetters.setRecommendationQuery).toBe(input.recommendations.setRecommendationQuery);
    expect(actionInput.complianceSetters.setComplianceError).toBe(input.compliance.setComplianceError);

    const controller = projectReadyEditorController({ ...input, actions });

    expect(controller.state).toBe(input.currentState);
    expect(controller.rawJson).toBe(input.workspace.rawJson);
    expect(controller.canUndo).toBe(true);
    expect(controller.canRedo).toBe(false);
    expect(controller.setSelection).toBe(input.workspace.setSelection);
    expect(controller.setRecommendationQuery).toBe(input.recommendations.setRecommendationQuery);
    expect(controller.setRawJson).toBe(actions.setRawJson);
  });
});
