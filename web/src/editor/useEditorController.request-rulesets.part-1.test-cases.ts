/** Focused useEditorController ruleset request intent request-intent scenarios. */
import { afterEach, applyBaselineTemplate, currentReady, describe, expect, importRulesetFile, it, renderBaselineController, renderController, vi } from "./useEditorController.test-harness.js";
import { createBaselineRuleset } from "./baseline-test-fixtures.js";
import { lastBodyFor } from "./useEditorController.request-intent-test-helpers.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController ruleset request intent", () => {
it("validates the workspace produced by a baseline import", async () => {
    const { requests, result } = await renderBaselineController();
    await applyBaselineTemplate(result);

    const body = lastBodyFor(requests, "/api/workspace/validate");
    expect(JSON.stringify(body.workspace)).toContain("Baseline imported setting");
    expect(currentReady(result).controller.status).toBe("Applied baseline template");
  });

  it("validates the workspace produced by an uploaded ruleset import", async () => {
    const uploadedRuleset = createBaselineRuleset();
    const rulesetForMutation = uploadedRuleset as { policies?: Array<{ rules?: Array<{ mappings?: Array<{ values?: Record<string, unknown> }> }> }> };
    const firstPolicy = rulesetForMutation.policies?.[0];
    const firstMapping = firstPolicy?.rules?.[0]?.mappings?.[0];
    if (firstMapping?.values !== undefined) {
      firstMapping.values.name = "Uploaded ruleset request body proof";
    }
    const { requests, result } = await renderController();
    await importRulesetFile(result, uploadedRuleset, "uploaded-ruleset.json");

    const body = lastBodyFor(requests, "/api/workspace/validate");
    expect(JSON.stringify(body.workspace)).toContain("Uploaded ruleset request body proof");
    expect(currentReady(result).controller.status).toBe("Imported ruleset uploaded-ruleset.json");
  });
});
