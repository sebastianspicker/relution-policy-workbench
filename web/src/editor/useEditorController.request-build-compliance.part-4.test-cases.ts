/** Focused useEditorController build and compliance request intent request-intent scenarios. */
import { act, controllerSuite, createComplianceReport, currentReady, expect, installFetchMock, it, renderReadyController, resolveControllerAction, startConcurrentComplianceChecks } from "./useEditorController.test-harness.js";
import { blockedRuleset, deferred } from "./useEditorController.request-intent-test-helpers.js";

controllerSuite("useEditorController build and compliance request intent", () => {

  it("does not restore compliance loading when an older request finishes last", async () => {
    const { result, requests } = await startConcurrentComplianceChecks();
    await resolveControllerAction(requests.second, requests.secondResponse, { report: createComplianceReport() });
    expect(currentReady(result).controller.complianceLoading).toBe(false);
    await resolveControllerAction(requests.first, requests.firstResponse, { report: createComplianceReport() });
    expect(currentReady(result).controller.complianceLoading).toBe(false);
  });

  it("does not let an older delayed ruleset overwrite a newer blocked report", async () => {
    installFetchMock();
    const { result } = await renderReadyController();
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
});
