/** Verifies baseline-template HTTP parsing and import-name construction at the client boundary. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { baselineTemplateImportName, fetchBaselineTemplateRuleset } from "./baseline-template-client.js";
import { readJsonResponse } from "./editor-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchBaselineTemplateRuleset", () => {
  it("preserves non-JSON error responses from the template endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("gateway unavailable", { status: 502 }));

    await expect(fetchBaselineTemplateRuleset({ platform: "IOS", tier: 1, shape: "modules" })).rejects.toThrow(/gateway unavailable/u);
  });

  it("rejects empty template endpoint responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));

    await expect(fetchBaselineTemplateRuleset({ platform: "IOS", tier: 1, shape: "modules" })).rejects.toThrow(/empty response/u);
  });

  it("parses successful template responses and includes the full selection query", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ version: 1 }), { status: 200 }));
    await expect(fetchBaselineTemplateRuleset({ platform: "IOS", tier: 3, shape: "full" })).resolves.toEqual({ version: 1 });
    expect(String(fetch.mock.calls[0]![0])).toBe("/api/baseline-templates/template?platform=IOS&tier=3&shape=full");
  });

  it("preserves parsed JSON 4xx responses and names imports deterministically", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "unsupported template" }), { status: 422 }));
    await expect(fetchBaselineTemplateRuleset({ platform: "MACOS", tier: 2, shape: "modules" })).rejects.toThrow('{"error":"unsupported template"}');
    expect(baselineTemplateImportName({ platform: "MACOS", tier: 2, shape: "modules" })).toBe("baseline MACOS tier 2 modules");
  });
});

describe("readJsonResponse", () => {
  it("rejects empty response bodies instead of fabricating an empty object", async () => {
    await expect(readJsonResponse(new Response(""))).rejects.toThrow(/empty response/u);
  });
});
