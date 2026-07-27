/** Focused useEditorController baseline imports controller scenarios. */
import { act, afterEach, applyBaselineTemplate, createAppState, currentReady, describe, expect, it, renderBaselineController, vi } from "./useEditorController.test-harness.js";

afterEach(() => { vi.restoreAllMocks(); });

describe("useEditorController baseline imports", () => {
it("applies a baseline template through the ruleset importer", async () => {
  const { result } = await renderBaselineController();
  await applyBaselineTemplate(result);

  const ready = currentReady(result).controller;
  expect(ready.status).toBe("Applied baseline template");
  expect(ready.isDirty).toBe(true);
  expect(ready.canUndo).toBe(true);
  expect(ready.rulesetReport?.applied.map((entry) => entry.ruleId)).toEqual(["baseline-ios-passcode"]);
  expect(JSON.stringify(ready.state.workspace)).toContain("Baseline imported setting");

  await act(async () => {
    currentReady(result).controller.undoWorkspace();
  });

  expect(JSON.stringify(currentReady(result).controller.state.workspace)).toContain("Original name");
});

it("keeps blocked status when a baseline template has unresolved rules", async () => {
  const { result } = await renderBaselineController(createAppState(), {
    baselineTemplates: {
      template: {
        version: 1,
        name: "Unresolved baseline",
        policies: [{ platform: "IOS", name: "Unresolved iOS", rules: [{ id: "missing-baseline-rule", title: "Missing baseline rule", mappings: [] }] }],
      },
    },
  });
  await applyBaselineTemplate(result);

  const ready = currentReady(result).controller;
  expect(ready.status).toBe("Ruleset import blocked: 0 conflict(s), 1 unresolved rule(s)");
  expect(ready.rulesetReport?.unresolved.map((entry) => entry.ruleId)).toEqual(["missing-baseline-rule"]);
  expect(ready.isDirty).toBe(false);
});

it("applies an expert baseline selection through the ruleset importer", async () => {
  const { result } = await renderBaselineController();

  await act(async () => {
    await currentReady(result).controller.applyExpertBaselineSelection({
      version: 1,
      name: "Expert baseline",
      policies: [
        {
          platform: "IOS",
          name: "Expert iOS",
          rules: [
            {
              id: "expert-ios-passcode",
              title: "Expert passcode",
              informational: false,
              mappings: [
                {
                  kind: "relution-native",
                  type: "NATIVE_SINGLE",
                  values: {
                    type: "NATIVE_SINGLE",
                    name: "Expert imported setting",
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  const ready = currentReady(result).controller;
  expect(ready.status).toBe("Applied expert baseline selection");
  expect(ready.rulesetReport?.applied.map((entry) => entry.ruleId)).toEqual(["expert-ios-passcode"]);
  expect(JSON.stringify(ready.state.workspace)).toContain("Expert imported setting");
});

it("keeps validation blocked status when an expert baseline workspace is invalid", async () => {
  const state = createAppState();
  state.validation = { ok: false, errors: [{ path: "/policies/0", message: "invalid baseline workspace" }] };
  const { result } = await renderBaselineController(state);

  await act(async () => {
    await currentReady(result).controller.applyExpertBaselineSelection({
      version: 1,
      name: "Invalid expert baseline",
      policies: [{ platform: "IOS", name: "Invalid expert iOS", rules: [{ id: "expert-invalid", title: "Invalid expert", informational: false, mappings: [{ kind: "relution-native", type: "NATIVE_SINGLE", values: { type: "NATIVE_SINGLE", name: "Invalid expert setting" } }] }] }],
    });
  });

  const ready = currentReady(result).controller;
  expect(ready.status).toContain("Ruleset validation blocked");
  expect(ready.status).not.toBe("Applied expert baseline selection");
  expect(JSON.stringify(ready.state.workspace)).not.toContain("Invalid expert setting");
});
});
