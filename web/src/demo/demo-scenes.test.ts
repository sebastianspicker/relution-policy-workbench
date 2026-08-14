/** Verifies the static walkthrough's route and evidence inventory. */
import { describe, expect, it } from "vitest";
import { DEMO_SCENES, sceneFromHash } from "./demo-scenes.js";

describe("static demo scenes", () => {
  it("keeps a compact sanitized tour", () => {
    expect(DEMO_SCENES.map((scene) => scene.id)).toEqual(["overview", "baseline", "policy", "audit"]);
    expect(DEMO_SCENES.every((scene) => scene.detail.length > 0 && scene.imageAlt.length > 0)).toBe(true);
  });

  it("uses hash routes that work on GitHub Pages", () => {
    expect(sceneFromHash("#/tour/policy")).toBe("policy");
    expect(sceneFromHash("#audit")).toBe("audit");
    expect(sceneFromHash("#/unknown")).toBe("overview");
  });
});
