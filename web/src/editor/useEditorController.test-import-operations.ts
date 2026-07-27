/** Baseline and uploaded-ruleset operations shared by controller tests. */
import { act } from "@testing-library/react";
import { vi } from "vitest";
import { currentReady } from "./useEditorController.test-core.js";
import { renderController } from "./useEditorController.test-runner.js";
import type { FetchMockOptions } from "./useEditorController.test-fetch-types.js";
import { createAppState } from "./useEditorController.test-fixtures.js";
import type { useEditorController } from "./useEditorController.js";
import type { AppState } from "./types.js";

export async function renderBaselineController(state: AppState = createAppState(), options: FetchMockOptions = {}) {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  return await renderController(state, options);
}

export async function applyBaselineTemplate(result: { current: ReturnType<typeof useEditorController> }): Promise<void> {
  await act(async () => { await currentReady(result).controller.applyBaselineTemplate({ platform: "IOS", tier: 3, shape: "modules" }); });
}

export async function importRulesetFile(result: { current: ReturnType<typeof useEditorController> }, ruleset: unknown, name: string): Promise<void> {
  await act(async () => { currentReady(result).controller.setRulesetFile(new File([JSON.stringify(ruleset)], name, { type: "application/json" })); });
  await act(async () => { await currentReady(result).controller.importRuleset(); });
}
