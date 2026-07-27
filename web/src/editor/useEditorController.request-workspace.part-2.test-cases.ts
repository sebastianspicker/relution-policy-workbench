/** Focused useEditorController workspace request intent request-intent scenarios. */
import { act, afterEach, createAppState, currentReady, deferEndpoint, describe, expect, expectOriginalConfigurationClean, it, renderSelectedController, requestPath, resolveControllerAction, startControllerAction, updateConfigurationName, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController workspace request intent", () => {

  it("blocks local edits and applies the authoritative add-configuration response", async () => {
    const state = createAppState();
    const { result } = await renderSelectedController(state);

    const addConfigurationResponse = deferEndpoint("/api/add-configuration");
    await act(async () => { currentReady(result).controller.setSelectedType("NATIVE_SINGLE"); });
    const addingConfiguration = await startControllerAction(() => currentReady(result).controller.addConfiguration());
    await updateConfigurationName(result, "Edit after add configuration");
    await act(async () => { await currentReady(result).controller.saveWorkspace(); });
    expect(vi.mocked(globalThis.fetch).mock.calls.filter(([input]) => requestPath(input) === "/api/workspace")).toHaveLength(0);
    expect(currentReady(result).controller.status).toContain("server workspace mutation");
    await resolveControllerAction(addingConfiguration, addConfigurationResponse, { workspace: state.workspace, validation: state.validation });

    expectOriginalConfigurationClean(result);
  });

  it("blocks local edits and applies the authoritative add-policy response", async () => {
    const state = createAppState();
    const { result } = await renderSelectedController(state);
    const addPolicyResponse = deferEndpoint("/api/add-policy");
    await act(async () => { currentReady(result).controller.setNewPolicyName("Late policy"); });
    const addingPolicy = await startControllerAction(() => currentReady(result).controller.addPolicy());
    await updateConfigurationName(result, "Edit after add policy");
    await resolveControllerAction(addingPolicy, addPolicyResponse, { workspace: state.workspace, validation: state.validation, policyPath: "policies/late.json" });

    expect(currentReady(result).controller.isDirty).toBe(false);
    expect(currentReady(result).controller.status).toBe("Created Late policy");
  });
});
