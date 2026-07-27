/** Focused useEditorController build and compliance request intent request-intent scenarios. */
import { act, controllerSuite, createComplianceReport, currentReady, deferEndpoint, expect, it, renderSelectedController, resolveControllerAction, startConcurrentComplianceChecks, startControllerAction, waitFor } from "./useEditorController.test-harness.js";

controllerSuite("useEditorController build and compliance request intent", () => {

  it("does not attach a late compliance report to a changed selection", async () => {
    const { result } = await renderSelectedController();
    const complianceResponse = deferEndpoint("/api/compliance/check");
    const checking = await startControllerAction(() => currentReady(result).controller.refreshCompliance());
    await act(async () => { currentReady(result).controller.setSelection({ policyIndex: 0, versionIndex: 0 }); });
    await resolveControllerAction(checking, complianceResponse, { report: createComplianceReport() });

    expect(currentReady(result).controller.selection?.configurationIndex).toBeUndefined();
    expect(currentReady(result).controller.complianceReport).toBeUndefined();
  });

  it("keeps compliance loading visible until the latest concurrent request finishes", async () => {
    const { result, requests } = await startConcurrentComplianceChecks();
    await waitFor(() => { expect(requests.requestCount()).toBe(2); });
    await resolveControllerAction(requests.first, requests.firstResponse, { report: createComplianceReport() });
    expect(currentReady(result).controller.complianceLoading).toBe(true);
    await resolveControllerAction(requests.second, requests.secondResponse, { report: createComplianceReport() });
    expect(currentReady(result).controller.complianceLoading).toBe(false);
  });
});
