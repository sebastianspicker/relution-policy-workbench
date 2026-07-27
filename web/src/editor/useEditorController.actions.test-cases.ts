/** Focused useEditorController action result controller scenarios. */
import { afterEach, buildArchive, createAppState, currentReady, describe, expect, it, renderAfterFailedBuild, renderController, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController action result", () => {
it("sets lastActionResult ok false when an action fails", async () => {
    const controller = currentReady((await renderAfterFailedBuild({ buildError: new Error("network down") })).result).controller;

    expect(controller.lastActionResult).toEqual({ ok: false, error: "network down" });
  });

  it("clears lastActionResult after a subsequent successful action", async () => {
    const { result } = await renderAfterFailedBuild({ buildError: new Error("network down") });
    expect(currentReady(result).controller.lastActionResult).toEqual({ ok: false, error: "network down" });

    await buildArchive(result);

    expect(currentReady(result).controller.lastActionResult).toEqual({ ok: true });
  });

  it("keeps network and server action errors distinguishable in lastActionResult", async () => {
    const { result } = await renderController(createAppState(), {
      buildError: new Error("network down"),
      buildResult: { error: "server exploded" },
      buildStatus: 500,
    });
    await buildArchive(result);
    const networkError = currentReady(result).controller.lastActionResult;

    await buildArchive(result);
    const serverError = currentReady(result).controller.lastActionResult;

    expect(networkError).toEqual({ ok: false, error: "network down" });
    expect(serverError).toEqual({ ok: false, error: 'Build blocked: {"error":"server exploded"}' });
    expect(networkError).not.toEqual(serverError);
  });
});
