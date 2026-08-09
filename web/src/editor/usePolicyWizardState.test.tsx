/** Characterizes the policy-wizard state seam independently from its presentation components. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BaselineTemplateOptionsResponse } from "../../../src/baseline-templates.js";
import { createBaselineExpertOptions, createBaselineTemplateOptions } from "./baseline-test-fixtures.js";
import { installFetchMock, jsonResponse } from "./useEditorController.test-helpers.js";
import { usePolicyWizardState } from "./usePolicyWizardState.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePolicyWizardState", () => {
  it("initializes the default scope and preset selection", async () => {
    const requests = installFetchMock();
    const { result } = renderHook(() => usePolicyWizardState());

    expect(result.current).toMatchObject({
      mode: "guided",
      platform: "IOS",
      tier: 3,
      shape: "modules",
      selectedSettingIds: [],
      selectedSources: ["bsi", "vendor", "cis"],
    });

    await waitFor(() => expect(result.current.expertOptions).toBeDefined());

    expect(result.current.selectedSettingIds).toEqual([
      "relution-native:IOS_PASSCODE",
      "relution-native:IOS_RESTRICTION",
      "relution-native:IOS_UPDATE",
    ]);
    expect(requests.map((request) => request.url)).toEqual([
      "/api/baseline-templates",
      "/api/baseline-templates/expert",
    ]);
  });

  it("resets the expert preset when selected sources change", async () => {
    installFetchMock();
    const { result } = renderHook(() => usePolicyWizardState());

    await waitFor(() => expect(result.current.selectedSettingIds).toHaveLength(3));

    act(() => result.current.setSelectedSources(["cis"]));

    await waitFor(() => expect(result.current.selectedSettingIds).toEqual([]));
  });

  it("resets the preset immediately when an expert tier changes", async () => {
    installFetchMock();
    const { result } = renderHook(() => usePolicyWizardState());

    await waitFor(() => expect(result.current.selectedSettingIds).toHaveLength(3));
    act(() => result.current.setMode("expert"));
    act(() => result.current.chooseTier(1));

    expect(result.current.tier).toBe(1);
    expect(result.current.selectedSettingIds).toHaveLength(4);
  });

  it("corrects unavailable platform, shape, and tier selections after options load", async () => {
    const index = correctedOptions();
    const requests = installFetchMock(undefined, { baselineTemplates: { index } });
    const { result } = renderHook(() => usePolicyWizardState());

    await waitFor(() => expect(result.current).toMatchObject({ platform: "WINDOWS", shape: "modules", tier: 1 }));

    act(() => result.current.setShape("full"));

    await waitFor(() => expect(result.current.tier).toBe(2));
    expect(requests.map((request) => request.url)).toEqual([
      "/api/baseline-templates",
      "/api/baseline-templates/expert",
      "/api/baseline-templates/expert",
      "/api/baseline-templates/expert",
    ]);
  });

  it("surfaces an options-loading error without rendering options", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/baseline-templates") return jsonResponse({ error: "template service unavailable" }, 503);
      return jsonResponse(createBaselineExpertOptions());
    });
    const { result } = renderHook(() => usePolicyWizardState());

    expect(result.current.options).toBeUndefined();
    expect(result.current.loadError).toBeUndefined();

    await waitFor(() => expect(result.current.loadError).toBe('{"error":"template service unavailable"}'));
    expect(result.current.options).toBeUndefined();
  });
});

function correctedOptions(): BaselineTemplateOptionsResponse {
  const defaults = createBaselineTemplateOptions();
  return {
    ...defaults,
    platforms: ["WINDOWS"],
    options: [
      { ...defaults.options[0]!, platform: "WINDOWS", tier: 1, shape: "modules" },
      { ...defaults.options[3]!, platform: "WINDOWS", tier: 2, shape: "full" },
    ],
  };
}
