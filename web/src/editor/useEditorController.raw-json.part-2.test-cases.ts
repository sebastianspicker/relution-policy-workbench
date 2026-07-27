/** Focused useEditorController raw JSON controller scenarios. */
import { afterEach, currentReady, describe, expect, it, renderSelectedController, updateConfigurationName, vi, waitFor } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController raw JSON", () => {

  it("keeps raw JSON synchronized when the draft is clean", async () => {
    const { result } = await renderSelectedController();

    await waitFor(() => {
      expect(currentReady(result).controller.rawJson).toContain("\"Original name\"");
    });

    expect(currentReady(result).controller.rawJsonDirty).toBe(false);

    await updateConfigurationName(result, "Guided change");

    expect(currentReady(result).controller.rawJson).toContain("\"Guided change\"");
    expect(currentReady(result).controller.rawJsonDirty).toBe(false);
  });
});
