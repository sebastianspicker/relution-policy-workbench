/** Focused useEditorController archive and key state controller scenarios. */
import { afterEach, buildArchive, createAppState, currentReady, describe, expect, it, renderController, selectFirstConfiguration, updateConfigurationName, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController archive and key state", () => {
it("marks downloads fresh only after a build and clears freshness on edit", async () => {
    const { result } = await renderController();

    expect(currentReady(result).controller.hasFreshBuild).toBe(false);

    await buildArchive(result);

    expect(currentReady(result).controller.hasFreshBuild).toBe(true);

    await selectFirstConfiguration(result);
    await updateConfigurationName(result, "Edited after build");

    expect(currentReady(result).controller.hasFreshBuild).toBe(false);
  });

  it("does not mark downloads fresh when build verification fails", async () => {
    const { result } = await renderController(createAppState(), {
      buildResult: {
        outputFile: "unverified-build.rexp",
        verification: {
          ok: false,
          checkedEntries: [{ path: "metadata.json", hashStatus: "mismatch" }],
        },
        failedEntryCount: 1,
      },
    });
    await buildArchive(result);

    expect(currentReady(result).controller.hasFreshBuild).toBe(false);
    expect(currentReady(result).controller.status).toBe("Build verification failed");
  });
});
