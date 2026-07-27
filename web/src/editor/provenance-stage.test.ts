/** Covers provenance workflow stage resolution for the Signal Desk instrument strip. */
import { describe, expect, it } from "vitest";
import { provenanceSchemaLabel, resolveProvenanceStage } from "./provenance-stage.js";

describe("resolveProvenanceStage", () => {
  it("keeps Select current until the workspace is loaded", () => {
    const steps = resolveProvenanceStage({
      appSection: "policies",
      workspaceLoaded: false,
      hasFreshBuild: false,
    });
    expect(steps.map((step) => step.state)).toEqual(["current", "pending", "pending", "pending"]);
  });

  it("marks Configure current on the policies section", () => {
    const steps = resolveProvenanceStage({
      appSection: "policies",
      workspaceLoaded: true,
      hasFreshBuild: false,
    });
    expect(steps.map((step) => `${step.id}:${step.state}`)).toEqual([
      "select:done",
      "configure:current",
      "assure:pending",
      "build:pending",
    ]);
  });

  it("marks Assure current for baselines and device audit", () => {
    for (const appSection of ["baselines", "device-audit"] as const) {
      const steps = resolveProvenanceStage({
        appSection,
        workspaceLoaded: true,
        hasFreshBuild: false,
      });
      expect(steps.find((step) => step.id === "assure")?.state).toBe("current");
      expect(steps.find((step) => step.id === "select")?.state).toBe("done");
      expect(steps.find((step) => step.id === "configure")?.state).toBe("done");
    }
  });

  it("marks Build current on settings and can mark Build done after a fresh archive", () => {
    const settings = resolveProvenanceStage({
      appSection: "settings",
      workspaceLoaded: true,
      hasFreshBuild: false,
    });
    expect(settings.map((step) => step.state)).toEqual(["done", "done", "done", "current"]);

    const afterBuild = resolveProvenanceStage({
      appSection: "policies",
      workspaceLoaded: true,
      hasFreshBuild: true,
    });
    expect(afterBuild.find((step) => step.id === "build")?.state).toBe("done");
    expect(afterBuild.find((step) => step.id === "configure")?.state).toBe("current");
  });
});

describe("provenanceSchemaLabel", () => {
  it("prefixes bare server versions and falls back to Relution 26.1.1", () => {
    expect(provenanceSchemaLabel("26.1.1")).toBe("Relution 26.1.1");
    expect(provenanceSchemaLabel("Relution 26.2.0")).toBe("Relution 26.2.0");
    expect(provenanceSchemaLabel(undefined)).toBe("Relution 26.1.1");
    expect(provenanceSchemaLabel("  ")).toBe("Relution 26.1.1");
  });
});
