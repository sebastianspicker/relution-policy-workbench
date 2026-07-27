/** Shared setup and browser event driver for controller history scenarios. */
import { act } from "@testing-library/react";
import { expect, vi } from "vitest";
import { currentReady } from "./useEditorController.test-core.js";
import { renderController, renderSelectedController, updateConfigurationName } from "./useEditorController.test-runner.js";
import type { EditorControllerResult } from "./types.js";

type ControllerResultRef = { current: EditorControllerResult };

export async function renderDirtySelectedConfiguration(name: string) {
  const hook = await renderSelectedController();
  await updateConfigurationName(hook.result, name);
  return hook.result;
}

export function dispatchBeforeUnload(): BeforeUnloadEvent {
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  Object.defineProperty(event, "returnValue", { configurable: true, writable: true, value: undefined });
  window.dispatchEvent(event);
  return event;
}

export async function renderClearedWorkspace(): Promise<ControllerResultRef> {
  vi.spyOn(window, "confirm").mockImplementation(() => { throw new Error("clearWorkspace should not call window.confirm"); });
  const { result } = await renderController();
  expect(currentReady(result).controller.state.workspace.policies.length).toBe(1);
  await act(async () => { currentReady(result).controller.clearWorkspace(); });
  return result;
}

export function expectWorkspaceCleared(result: ControllerResultRef): void {
  expect(currentReady(result).controller.state.workspace.policies.length).toBe(0);
  expect(currentReady(result).controller.isDirty).toBe(true);
  expect(currentReady(result).controller.status).toBe("Cleared workspace");
}

export async function undoWorkspace(result: ControllerResultRef): Promise<void> {
  await act(async () => { currentReady(result).controller.undoWorkspace(); });
}

export async function redoWorkspace(result: ControllerResultRef): Promise<void> {
  await act(async () => { currentReady(result).controller.redoWorkspace(); });
}
