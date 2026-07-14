import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBaselineRuleset } from "./baseline-test-fixtures.js";
import { useEditorController } from "./useEditorController.js";
import {
  createAppState,
  createComplianceReport,
  currentReady,
  type FetchRequestRecord,
  installFetchMock,
  jsonResponse,
  waitForReady,
} from "./useEditorController.test-helpers.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEditorController request intent", () => {
  it("posts the selected compliance remediation request before accepting the persisted response", async () => {
    const requests = installFetchMock(createAppState(), { complianceReport: createComplianceReport() });
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0, configurationIndex: 0 });
    });
    await waitFor(() => {
      expect(currentReady(result).controller.complianceReport?.results[0]?.recommendationId).toBe("bsi-native-gap");
    });

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    const body = lastBodyFor(requests, "/api/compliance/apply");
    expect(body).toMatchObject({
      selection: { policyIndex: 0, versionIndex: 0 },
      sources: ["bsi", "vendor", "cis"],
      source: "bsi",
      recommendationId: "bsi-native-gap",
      remediationId: "native-bundle:bsi-native-bundle",
    });
    expect(JSON.stringify(body.workspace)).toContain("Original name");
    expect(currentReady(result).controller.status).toContain("Applied compliance remediation");
  });

  it("posts the current dirty workspace when saving", async () => {
    const requests = installFetchMock();
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0, configurationIndex: 0 });
    });
    await act(async () => {
      const controller = currentReady(result).controller;
      controller.updateSelectedConfiguration({
        ...(controller.configuration ?? {}),
        details: {
          ...(controller.details ?? {}),
          name: "Saved request body proof",
        },
      });
    });
    await act(async () => {
      await currentReady(result).controller.saveWorkspace();
    });

    const body = lastBodyFor(requests, "/api/workspace");
    expect(JSON.stringify(body.workspace)).toContain("Saved request body proof");
    expect(currentReady(result).controller.status).toBe("Saved workspace");
  });

  it("keeps newer local edits dirty when a save response arrives late", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    await updateConfigurationName(result, "Edit A");
    const response = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/workspace");
      return await response.promise;
    });

    let saving!: Promise<void>;
    await act(async () => { saving = currentReady(result).controller.saveWorkspace(); });
    await updateConfigurationName(result, "Edit B");
    response.resolve(jsonResponse({ workspace: state.workspace, validation: state.validation }));
    await act(async () => { await saving; });

    expect(currentReady(result).controller.details?.name).toBe("Edit B");
    expect(currentReady(result).controller.isDirty).toBe(true);
    expect(currentReady(result).controller.canUndo).toBe(true);
  });

  it("blocks local edits and applies the authoritative add-configuration response", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);

    const addConfigurationResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/add-configuration");
      return await addConfigurationResponse.promise;
    });
    await act(async () => { currentReady(result).controller.setSelectedType("NATIVE_SINGLE"); });
    let addingConfiguration!: Promise<void>;
    await act(async () => { addingConfiguration = currentReady(result).controller.addConfiguration(); });
    await updateConfigurationName(result, "Edit after add configuration");
    await act(async () => { await currentReady(result).controller.saveWorkspace(); });
    expect(vi.mocked(globalThis.fetch).mock.calls.filter(([input]) => requestPath(input) === "/api/workspace")).toHaveLength(0);
    expect(currentReady(result).controller.status).toContain("server workspace mutation");
    addConfigurationResponse.resolve(jsonResponse({ workspace: state.workspace, validation: state.validation }));
    await act(async () => { await addingConfiguration; });

    expect(currentReady(result).controller.details?.name).toBe("Original name");
    expect(currentReady(result).controller.isDirty).toBe(false);
  });

  it("blocks local edits and applies the authoritative add-policy response", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const addPolicyResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/add-policy");
      return await addPolicyResponse.promise;
    });
    await act(async () => { currentReady(result).controller.setNewPolicyName("Late policy"); });
    let addingPolicy!: Promise<void>;
    await act(async () => { addingPolicy = currentReady(result).controller.addPolicy(); });
    await updateConfigurationName(result, "Edit after add policy");
    addPolicyResponse.resolve(jsonResponse({ workspace: state.workspace, validation: state.validation, policyPath: "policies/late.json" }));
    await act(async () => { await addingPolicy; });

    expect(currentReady(result).controller.isDirty).toBe(false);
    expect(currentReady(result).controller.status).toBe("Created Late policy");
  });

  it("merges a late key response after a newer workspace edit", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);

    const keyResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/key");
      return await keyResponse.promise;
    });
    await act(async () => { currentReady(result).controller.setKeyValue("test-key"); });
    let settingKey!: Promise<void>;
    await act(async () => { settingKey = currentReady(result).controller.setActiveKey(); });
    await updateConfigurationName(result, "Edit after key request");
    keyResponse.resolve(jsonResponse({ keySet: true, validated: true }));
    await act(async () => { await settingKey; });

    expect(currentReady(result).controller.details?.name).toBe("Edit after key request");
    expect(currentReady(result).controller.state.keySet).toBe(true);
    expect(currentReady(result).controller.state.keyValidated).toBe(true);
  });

  it("ignores an older key request failure after a newer key succeeds", async () => {
    installFetchMock();
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);
    const firstResponse = deferred<Response>();
    let requestCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      requestCount += 1;
      if (requestCount === 1) return await firstResponse.promise;
      return jsonResponse({ keySet: true, validated: true });
    });
    await act(async () => { currentReady(result).controller.setKeyValue("older-key"); });
    let older!: Promise<void>;
    await act(async () => { older = currentReady(result).controller.setActiveKey(); });
    await act(async () => { currentReady(result).controller.setKeyValue("newer-key"); });
    await act(async () => { await currentReady(result).controller.setActiveKey(); });
    firstResponse.resolve(jsonResponse({ error: "stale key failure" }, 500));
    await act(async () => { await older; });

    expect(currentReady(result).controller.state.keySet).toBe(true);
    expect(currentReady(result).controller.status).not.toContain("stale key failure");
  });

  it("merges a late sidecar mutation after a newer workspace edit", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const sidecarResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/ddm/artifact");
      return await sidecarResponse.promise;
    });
    await act(async () => { currentReady(result).controller.setDdmSchemaId("com.example.ddm"); });
    await waitFor(() => { expect(currentReady(result).controller.ddmSchemaId).toBe("com.example.ddm"); });
    let addingArtifact!: Promise<void>;
    await act(async () => { addingArtifact = currentReady(result).controller.addDdmArtifact(); });
    await updateConfigurationName(result, "Edit after sidecar mutation");
    sidecarResponse.resolve(jsonResponse({
      sidecar: { ...state.sidecar, ddmArtifacts: [{ uuid: "artifact-1" }] },
    }));
    await act(async () => { await addingArtifact; });

    expect(currentReady(result).controller.details?.name).toBe("Edit after sidecar mutation");
    expect(currentReady(result).controller.isDirty).toBe(true);
    expect(currentReady(result).controller.state.sidecar.ddmArtifacts).toEqual([{ uuid: "artifact-1" }]);
  });

  it("blocks local edits and applies the authoritative sidecar-reconcile response", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const reconcileResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/roundtrip/reconcile");
      return await reconcileResponse.promise;
    });
    let reconciling!: Promise<void>;
    await act(async () => { reconciling = currentReady(result).controller.reconcileSidecar(); });
    await updateConfigurationName(result, "Edit after reconcile");
    reconcileResponse.resolve(jsonResponse({ workspace: state.workspace, validation: state.validation, sidecar: state.sidecar }));
    await act(async () => { await reconciling; });

    expect(currentReady(result).controller.details?.name).toBe("Original name");
    expect(currentReady(result).controller.isDirty).toBe(false);
  });

  it("does not mark an archive fresh when a build response follows a newer edit", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const buildResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/build");
      return await buildResponse.promise;
    });
    let building!: Promise<void>;
    await act(async () => { building = currentReady(result).controller.buildArchive(); });
    await updateConfigurationName(result, "Edit after build started");
    buildResponse.resolve(jsonResponse({ outputFile: "stale.rexp", sidecar: state.sidecar, verification: { ok: true } }));
    await act(async () => { await building; });

    expect(currentReady(result).controller.details?.name).toBe("Edit after build started");
    expect(currentReady(result).controller.hasFreshBuild).toBe(false);
  });

  it("does not restore build loading when an older build finishes last", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    let requestCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      requestCount += 1;
      return await (requestCount === 1 ? firstResponse.promise : secondResponse.promise);
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => { first = currentReady(result).controller.buildArchive(); });
    await act(async () => { second = currentReady(result).controller.buildArchive(); });
    secondResponse.resolve(jsonResponse({ outputFile: "new.rexp", sidecar: state.sidecar, verification: { ok: true } }));
    await act(async () => { await second; });
    expect(currentReady(result).controller.isBuildLoading).toBe(false);
    firstResponse.resolve(jsonResponse({ outputFile: "old.rexp", sidecar: state.sidecar, verification: { ok: true } }));
    await act(async () => { await first; });
    expect(currentReady(result).controller.isBuildLoading).toBe(false);
    expect(currentReady(result).controller.state.outputFile).toBe("new.rexp");
  });

  it("blocks local edits and applies the authoritative archive import", async () => {
    const state = createAppState();
    installFetchMock(state);
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    await act(async () => {
      currentReady(result).controller.setImportFile(new File(["archive"], "late.rexp", { type: "application/octet-stream" }));
    });
    const importResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/import");
      return await importResponse.promise;
    });
    let importing!: Promise<void>;
    await act(async () => { importing = currentReady(result).controller.importArchive(); });
    await waitFor(() => { expect(globalThis.fetch).toHaveBeenCalled(); });
    await updateConfigurationName(result, "Edit after import started");
    importResponse.resolve(jsonResponse({ workspace: state.workspace, validation: state.validation, keySet: false, sidecar: state.sidecar }));
    await act(async () => { await importing; });

    expect(currentReady(result).controller.details?.name).toBe("Original name");
    expect(currentReady(result).controller.isDirty).toBe(false);
  });

  it("does not attach a late compliance report to a changed selection", async () => {
    installFetchMock();
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const complianceResponse = deferred<Response>();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/compliance/check");
      return await complianceResponse.promise;
    });
    let checking!: Promise<void>;
    await act(async () => { checking = currentReady(result).controller.refreshCompliance(); });
    await act(async () => { currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0 }); });
    complianceResponse.resolve(jsonResponse({ report: createComplianceReport() }));
    await act(async () => { await checking; });

    expect(currentReady(result).controller.selection?.configurationIndex).toBeUndefined();
    expect(currentReady(result).controller.complianceReport).toBeUndefined();
  });

  it("keeps compliance loading visible until the latest concurrent request finishes", async () => {
    installFetchMock();
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    let requestCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      expect(requestPath(input)).toBe("/api/compliance/check");
      requestCount += 1;
      return await (requestCount === 1 ? firstResponse.promise : secondResponse.promise);
    });

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => { first = currentReady(result).controller.refreshCompliance(); });
    await act(async () => { second = currentReady(result).controller.refreshCompliance(); });
    await waitFor(() => { expect(requestCount).toBe(2); });
    firstResponse.resolve(jsonResponse({ report: createComplianceReport() }));
    await act(async () => { await first; });
    expect(currentReady(result).controller.complianceLoading).toBe(true);
    secondResponse.resolve(jsonResponse({ report: createComplianceReport() }));
    await act(async () => { await second; });
    expect(currentReady(result).controller.complianceLoading).toBe(false);
  });

  it("does not restore compliance loading when an older request finishes last", async () => {
    installFetchMock();
    const { result } = renderHook(() => useEditorController());
    await selectConfiguration(result);
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    let requestCount = 0;
    vi.mocked(globalThis.fetch).mockImplementation(async () => {
      requestCount += 1;
      return await (requestCount === 1 ? firstResponse.promise : secondResponse.promise);
    });

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => { first = currentReady(result).controller.refreshCompliance(); });
    await act(async () => { second = currentReady(result).controller.refreshCompliance(); });
    secondResponse.resolve(jsonResponse({ report: createComplianceReport() }));
    await act(async () => { await second; });
    expect(currentReady(result).controller.complianceLoading).toBe(false);
    firstResponse.resolve(jsonResponse({ report: createComplianceReport() }));
    await act(async () => { await first; });
    expect(currentReady(result).controller.complianceLoading).toBe(false);
  });

  it("does not let an older delayed ruleset overwrite a newer blocked report", async () => {
    installFetchMock();
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);
    const oldText = deferred<string>();
    const oldFile = new File([""], "old.json", { type: "application/json" });
    Object.defineProperty(oldFile, "text", { value: async () => await oldText.promise });
    await act(async () => { currentReady(result).controller.setRulesetFile(oldFile); });
    let oldImport!: Promise<void>;
    await act(async () => { oldImport = currentReady(result).controller.importRuleset(); });

    const newer = blockedRuleset("newer-unresolved");
    await act(async () => {
      currentReady(result).controller.setRulesetFile(new File([JSON.stringify(newer)], "newer.json", { type: "application/json" }));
    });
    await act(async () => { await currentReady(result).controller.importRuleset(); });
    oldText.resolve(JSON.stringify(blockedRuleset("older-unresolved")));
    await act(async () => { await oldImport; });

    expect(currentReady(result).controller.rulesetReport?.unresolved.map((entry) => entry.ruleId)).toEqual(["newer-unresolved"]);
    expect(currentReady(result).controller.status).toContain("Ruleset import blocked");
  });

  it("validates the workspace produced by a baseline import", async () => {
    const requests = installFetchMock();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      await currentReady(result).controller.applyBaselineTemplate({ platform: "IOS", tier: 3, shape: "modules" });
    });

    const body = lastBodyFor(requests, "/api/workspace/validate");
    expect(JSON.stringify(body.workspace)).toContain("Baseline imported setting");
    expect(currentReady(result).controller.status).toBe("Applied baseline template");
  });

  it("validates the workspace produced by an uploaded ruleset import", async () => {
    const requests = installFetchMock();
    const uploadedRuleset = createBaselineRuleset();
    const rulesetForMutation = uploadedRuleset as { policies?: Array<{ rules?: Array<{ mappings?: Array<{ values?: Record<string, unknown> }> }> }> };
    const firstPolicy = rulesetForMutation.policies?.[0];
    const firstMapping = firstPolicy?.rules?.[0]?.mappings?.[0];
    if (firstMapping?.values !== undefined) {
      firstMapping.values.name = "Uploaded ruleset request body proof";
    }
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      currentReady(result).controller.setRulesetFile(new File([JSON.stringify(uploadedRuleset)], "uploaded-ruleset.json", { type: "application/json" }));
    });
    await act(async () => {
      await currentReady(result).controller.importRuleset();
    });

    const body = lastBodyFor(requests, "/api/workspace/validate");
    expect(JSON.stringify(body.workspace)).toContain("Uploaded ruleset request body proof");
    expect(currentReady(result).controller.status).toBe("Imported ruleset uploaded-ruleset.json");
  });

  it("keeps blocked status when an uploaded ruleset is rejected", async () => {
    const requests = installFetchMock();
    const uploadedRuleset = {
      version: 1,
      name: "Blocked uploaded ruleset",
      policies: [
        {
          platform: "IOS",
          name: "Blocked iOS",
          rules: [
            {
              id: "missing-uploaded-rule",
              title: "Missing uploaded rule",
              mappings: [],
            },
          ],
        },
      ],
    };
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      currentReady(result).controller.setRulesetFile(new File([JSON.stringify(uploadedRuleset)], "blocked-ruleset.json", { type: "application/json" }));
    });
    await act(async () => {
      await currentReady(result).controller.importRuleset();
    });

    expect(currentReady(result).controller.status).toBe("Ruleset import blocked: 0 conflict(s), 1 unresolved rule(s)");
    expect(currentReady(result).controller.isDirty).toBe(false);
    expect(currentReady(result).controller.rulesetReport?.unresolved.map((entry) => entry.ruleId)).toEqual(["missing-uploaded-rule"]);
    expect(requests.some((request) => request.url === "/api/workspace/validate")).toBe(false);
  });

  it("does not post compliance apply when no policy is selected", async () => {
    const requests = installFetchMock(createAppState(), { complianceReport: createComplianceReport() });
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    expect(currentReady(result).controller.status).toBe("Select a policy before applying compliance remediation");
    expect(requests.filter((request) => request.url === "/api/compliance/apply")).toEqual([]);
  });

  it("keeps compliance apply failures visible when the API rejects the request", async () => {
    const requests = installFetchMock(createAppState(), {
      complianceReport: createComplianceReport(),
      complianceApply: { error: "apply rejected" },
      complianceApplyStatus: 500,
    });
    const { result } = renderHook(() => useEditorController());
    await waitForReady(result.current, result);

    await act(async () => {
      currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0, configurationIndex: 0 });
    });
    await waitFor(() => {
      expect(currentReady(result).controller.complianceReport?.results[0]?.recommendationId).toBe("bsi-native-gap");
    });

    await act(async () => {
      await currentReady(result).controller.applyComplianceRemediation("native-bundle:bsi-native-bundle");
    });

    expect(lastBodyFor(requests, "/api/compliance/apply").remediationId).toBe("native-bundle:bsi-native-bundle");
    expect(currentReady(result).controller.status).toContain("Compliance remediation failed");
    expect(currentReady(result).controller.status).toContain("apply rejected");
  });
});

function lastBodyFor(requests: FetchRequestRecord[], url: string): Record<string, unknown> {
  const matches = requests.filter((request) => request.url === url);
  const body = matches[matches.length - 1]?.body;
  expect(body).toBeDefined();
  return body as Record<string, unknown>;
}

async function selectConfiguration(result: { current: ReturnType<typeof useEditorController> }): Promise<void> {
  await waitForReady(result.current, result);
  await act(async () => {
    currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0, configurationIndex: 0 });
  });
  await waitFor(() => { expect(currentReady(result).controller.selection?.configurationIndex).toBe(0); });
}

async function updateConfigurationName(result: { current: ReturnType<typeof useEditorController> }, name: string): Promise<void> {
  await act(async () => {
    const controller = currentReady(result).controller;
    controller.updateSelectedConfiguration({
      ...(controller.configuration ?? {}),
      details: { ...(controller.details ?? {}), name },
    });
  });
}

function deferred<T>(): { readonly promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function blockedRuleset(id: string): unknown {
  return {
    version: 1,
    name: id,
    policies: [{ platform: "IOS", name: id, rules: [{ id, title: id, mappings: [] }] }],
  };
}

function requestPath(input: RequestInfo | URL): string {
  return new URL(input instanceof Request ? input.url : String(input), "http://localhost").pathname;
}
