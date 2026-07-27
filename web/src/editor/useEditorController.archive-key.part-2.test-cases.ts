/** Focused useEditorController archive and key state controller scenarios. */
import { act, afterEach, buildArchive, createAppState, currentReady, describe, expect, it, renderController, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController archive and key state", () => {

  it("records archive passphrase validation status returned by the server", async () => {
    const { requests, result } = await renderController(createAppState(), {
      keyResult: {
        keySet: true,
        validated: false,
        reason: "No built .rexp output is available to validate this passphrase.",
      },
    });

    await act(async () => {
      currentReady(result).controller.setKeyValue("new-key");
    });

    await act(async () => {
      await currentReady(result).controller.setActiveKey();
    });

    const keyRequest = requests.find((request) => request.url === "/api/key");
    expect(keyRequest?.body).toEqual({ key: "new-key" });
    expect(currentReady(result).controller.state.keySet).toBe(true);
    expect(currentReady(result).controller.state.keyValidated).toBe(false);
    expect(currentReady(result).controller.status).toContain("Passphrase set, not validated");
  });

  it("clears fresh-build state after importing a workspace", async () => {
    const { result } = await renderController();
    await buildArchive(result);

    expect(currentReady(result).controller.hasFreshBuild).toBe(true);

    await act(async () => {
      currentReady(result).controller.setImportFile(new File(["test"], "import.rexp", { type: "application/octet-stream" }));
    });

    await act(async () => {
      await currentReady(result).controller.importArchive();
    });

    expect(currentReady(result).controller.hasFreshBuild).toBe(false);
  });
});
