/** Table-driven endpoint double for controller request tests. */
import { vi } from "vitest";
import { requestPath } from "./useEditorController.test-deferred-requests.js";

export function installEndpointResponses(responses: Readonly<Record<string, Response | Promise<Response>>>): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = requestPath(input);
    const response = responses[path];
    if (response === undefined) throw new Error(`Unhandled fetch in test: ${path}`);
    return await response;
  });
}
