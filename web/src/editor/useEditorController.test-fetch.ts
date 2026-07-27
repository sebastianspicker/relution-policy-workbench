/** Deterministic fetch double used by controller and component tests. */
import { vi } from "vitest";
import { jsonResponse } from "./useEditorController.test-core.js";
import { recommendationCatalogResponse } from "./useEditorController.test-fetch-catalog.js";
import { baselineTemplateResponse } from "./useEditorController.test-fetch-baselines.js";
import { complianceFetchResponse, stateFetchResponse } from "./useEditorController.test-fetch-state.js";
import { createAppState } from "./useEditorController.test-fixtures.js";
import type { FetchMockOptions, FetchRequestRecord, MockFetchResponse } from "./useEditorController.test-fetch-types.js";
import type { AppState } from "./types.js";

export function installFetchMock(state: AppState = createAppState(), options: FetchMockOptions = {}): FetchRequestRecord[] {
  const requests: FetchRequestRecord[] = [];
  let buildError = options.buildError;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = requestUrl(input);
    requests.push({ url, method: init?.method ?? "GET", body: requestBody(init) });
    const response = mockFetchResponse(url, state, options, buildError);
    if (response.kind === "build-error") {
      buildError = undefined;
      throw response.error;
    }
    if (response.kind === "handled") return response.response;
    throw new Error(`Unhandled fetch in test: ${url} (${init?.method ?? "GET"})`);
  });
  return requests;
}

function mockFetchResponse(url: string, state: AppState, options: FetchMockOptions, buildError: Error | undefined): MockFetchResponse {
  const routedResponse = routeResponse(url, state, options);
  if (routedResponse !== undefined) return { kind: "handled", response: routedResponse };
  if (url === "/api/build") return buildResponse(state, options, buildError);
  if (options.sidecarResponses?.[url] !== undefined) return { kind: "handled", response: jsonResponse(options.sidecarResponses[url]) };
  return { kind: "unhandled" };
}

function routeResponse(url: string, state: AppState, options: FetchMockOptions): Response | undefined {
  return recommendationCatalogResponse(url, options)
    ?? baselineTemplateResponse(url, options)
    ?? stateFetchResponse(url, state, options)
    ?? complianceFetchResponse(url, state, options);
}

function buildResponse(state: AppState, options: FetchMockOptions, buildError: Error | undefined): MockFetchResponse {
  if (buildError !== undefined) return { kind: "build-error", error: buildError };
  return { kind: "handled", response: jsonResponse(options.buildResult ?? { outputFile: "fresh-build.rexp", sidecar: state.sidecar, verification: { ok: true, checkedEntries: [] } }, options.buildStatus ?? 200) };
}

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
}

function requestBody(init: RequestInit | undefined): unknown {
  if (init?.body === undefined) return undefined;
  try {
    return JSON.parse(String(init.body)) as unknown;
  } catch {
    return String(init.body);
  }
}
