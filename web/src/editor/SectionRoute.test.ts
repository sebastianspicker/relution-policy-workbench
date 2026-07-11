import { afterEach, describe, expect, it } from "vitest";
import { canonicalHashFor, navigateToSectionRoute, routeFromHash } from "./SectionRoute.js";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("section routes", () => {
  it("parses every supported hash and rejects non-canonical routes", () => {
    expect(routeFromHash("#/policies")).toEqual({ route: "policies", canonical: true });
    expect(routeFromHash("#/baselines/builder")).toEqual({ route: "baselines/builder", canonical: true });
    expect(routeFromHash("#/baselines/recommendations")).toEqual({ route: "baselines/recommendations", canonical: true });
    expect(routeFromHash("#/baselines/compliance")).toEqual({ route: "baselines/compliance", canonical: true });
    expect(routeFromHash("#/device-audit")).toEqual({ route: "device-audit", canonical: true });
    expect(routeFromHash("#/settings")).toEqual({ route: "settings", canonical: true });
    expect(routeFromHash("")).toEqual({ route: "policies", canonical: false });
    expect(routeFromHash("#/unknown")).toEqual({ route: "policies", canonical: false });
  });

  it("uses hash history entries without reloading the workspace", () => {
    window.history.replaceState(null, "", "/workbench#/policies");
    navigateToSectionRoute("settings");

    expect(window.location.hash).toBe(canonicalHashFor("settings"));
    expect(window.location.pathname).toBe("/workbench");
  });
});
