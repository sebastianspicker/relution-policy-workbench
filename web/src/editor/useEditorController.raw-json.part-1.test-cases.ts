/** Focused useEditorController raw JSON controller scenarios. */
import { act, afterEach, currentReady, describe, expect, it, renderController, renderSelectedController, updateConfigurationName, vi, waitFor } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController raw JSON", () => {
it("does not claim raw JSON was applied when no configuration is selected", async () => {
    const { result } = await renderController();

    await act(async () => {
      currentReady(result).controller.setRawJson(JSON.stringify({ uuid: "CONF-1" }));
    });

    await act(async () => {
      currentReady(result).controller.applyRawJson();
    });

    expect(currentReady(result).controller.status).toBe("Select a configuration before applying raw JSON");
  });

  it("keeps the raw JSON draft across same-entity refreshes", async () => {
    const { result } = await renderSelectedController();

    await waitFor(() => {
      expect(currentReady(result).controller.rawJson).toContain("\"CONF-1\"");
    });

    await act(async () => {
      currentReady(result).controller.setRawJson("{\n  \"draft\": true\n}");
    });

    expect(currentReady(result).controller.rawJsonDirty).toBe(true);

    await updateConfigurationName(result, "Server refresh");

    expect(currentReady(result).controller.rawJson).toBe("{\n  \"draft\": true\n}");
    expect(currentReady(result).controller.rawJsonDirty).toBe(true);

    await act(async () => {
      currentReady(result).controller.resetRawJson();
    });

    expect(currentReady(result).controller.rawJson).toContain("\"Server refresh\"");
    expect(currentReady(result).controller.rawJsonDirty).toBe(false);
  });
});
