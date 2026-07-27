/** Shared controller-hook operations used by focused behavior suites. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { useEditorController } from "./useEditorController.js";
import { currentReady, waitForReady } from "./useEditorController.test-core.js";
import { installFetchMock } from "./useEditorController.test-fetch.js";
import type { FetchMockOptions } from "./useEditorController.test-fetch-types.js";
import { createAppState } from "./useEditorController.test-fixtures.js";
import type { AppState } from "./types.js";

export async function renderReadyController() {
  const hook = renderHook(() => useEditorController());
  await waitForReady(hook.result.current, hook.result);
  return hook;
}

export async function renderController(state: AppState = createAppState(), options: FetchMockOptions = {}) {
  const requests = installFetchMock(state, options);
  return { ...(await renderReadyController()), requests };
}

export async function renderSelectedController(state: AppState = createAppState(), options: FetchMockOptions = {}) {
  const hook = await renderController(state, options);
  await selectFirstConfiguration(hook.result);
  return hook;
}

export async function selectFirstConfiguration(result: { current: ReturnType<typeof useEditorController> }): Promise<void> {
  await waitForReady(result.current, result);
  await act(async () => { currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0, configurationIndex: 0 }); });
  await waitFor(() => { expect(currentReady(result).controller.selection?.configurationIndex).toBe(0); });
}

export async function updateConfigurationName(result: { current: ReturnType<typeof useEditorController> }, name: string): Promise<void> {
  await act(async () => {
    const controller = currentReady(result).controller;
    controller.updateSelectedConfiguration({ ...(controller.configuration ?? {}), details: { ...(controller.details ?? {}), name } });
  });
}

export async function buildArchive(result: { current: ReturnType<typeof useEditorController> }): Promise<void> {
  await act(async () => { await currentReady(result).controller.buildArchive(); });
}

export async function renderAfterFailedBuild(options: FetchMockOptions) {
  const hook = await renderController(createAppState(), options);
  await buildArchive(hook.result);
  return hook;
}
