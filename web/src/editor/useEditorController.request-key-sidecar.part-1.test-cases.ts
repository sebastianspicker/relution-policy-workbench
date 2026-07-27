/** Focused useEditorController key and sidecar request intent request-intent scenarios. */
import { act, afterEach, createAppState, currentReady, deferEndpoint, deferred, describe, expect, it, jsonResponse, renderController, renderSelectedController, resolveControllerAction, startControllerAction, updateConfigurationName, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController key and sidecar request intent", () => {
it("merges a late key response after a newer workspace edit", async () => {
    const state = createAppState();
    const { result } = await renderSelectedController(state);

    const keyResponse = deferEndpoint("/api/key");
    await act(async () => { currentReady(result).controller.setKeyValue("test-key"); });
    const settingKey = await startControllerAction(() => currentReady(result).controller.setActiveKey());
    await updateConfigurationName(result, "Edit after key request");
    await resolveControllerAction(settingKey, keyResponse, { keySet: true, validated: true });

    expect(currentReady(result).controller.details?.name).toBe("Edit after key request");
    expect(currentReady(result).controller.state.keySet).toBe(true);
    expect(currentReady(result).controller.state.keyValidated).toBe(true);
  });

  it("ignores an older key request failure after a newer key succeeds", async () => {
    const { result } = await renderController();
    const firstResponse = deferred<Response>();
    let requestCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      requestCount += 1;
      if (requestCount === 1) return await firstResponse.promise;
      return jsonResponse({ keySet: true, validated: true });
    });
    await act(async () => { currentReady(result).controller.setKeyValue("older-key"); });
    let older!: Promise<void>;
    await act(async () => { older = currentReady(result).controller.setActiveKey(); });
    await act(async () => { currentReady(result).controller.setKeyValue("newer-key"); });
    await act(async () => { await currentReady(result).controller.setActiveKey(); });
    firstResponse.resolve(jsonResponse({ error: "stale key failure" }, 500));
    await act(async () => { await older; });

    expect(currentReady(result).controller.state.keySet).toBe(true);
    expect(currentReady(result).controller.status).not.toContain("stale key failure");
  });
});
