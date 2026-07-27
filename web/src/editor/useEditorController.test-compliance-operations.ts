/** Selected-policy compliance lifecycle shared by controller scenarios. */
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { currentReady } from "./useEditorController.test-core.js";
import type { FetchMockOptions } from "./useEditorController.test-fetch-types.js";
import { createAppState } from "./useEditorController.test-fixtures.js";
import { createComplianceReport } from "./useEditorController.test-recommendation-fixtures.js";
import { renderSelectedController } from "./useEditorController.test-runner.js";
import type { AppState } from "./types.js";

export async function renderComplianceController(state: AppState = createAppState(), options: FetchMockOptions = {}) {
  const hook = await renderSelectedController(state, { complianceReport: createComplianceReport(), ...options });
  await waitFor(() => { expect(currentReady(hook.result).controller.complianceReport?.results[0]?.status).toBe("exact-gap"); });
  return hook;
}
