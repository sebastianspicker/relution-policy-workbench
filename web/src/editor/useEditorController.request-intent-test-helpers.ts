/** Shared request-intent test operations. */
import { expect, type FetchRequestRecord } from "./useEditorController.test-harness.js";
export { deferred } from "./useEditorController.test-deferred-requests.js";

export function lastBodyFor(requests: FetchRequestRecord[], url: string): Record<string, unknown> {
  const matches = requests.filter((request) => request.url === url);
  const body = matches[matches.length - 1]?.body;
  expect(body).toBeDefined();
  return body as Record<string, unknown>;
}

export function blockedRuleset(id: string): unknown {
  return {
    version: 1,
    name: id,
    policies: [{ platform: "IOS", name: id, rules: [{ id, title: id, mappings: [] }] }],
  };
}
