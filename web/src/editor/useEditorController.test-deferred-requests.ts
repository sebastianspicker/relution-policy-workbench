/** Deferred endpoint drivers for request-ordering controller tests. */
import { act } from "@testing-library/react";
import { vi } from "vitest";
import { jsonResponse } from "./useEditorController.test-core.js";

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

export interface PendingControllerAction {
  readonly pending: Promise<void>;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

export function requestPath(input: RequestInfo | URL): string {
  return new URL(input instanceof Request ? input.url : String(input), "http://localhost").pathname;
}

export function deferEndpoint(path: string): Deferred<Response> {
  const response = deferred<Response>();
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    const actual = requestPath(input);
    if (actual !== path) throw new Error(`Expected ${path}, got ${actual}`);
    return await response.promise;
  });
  return response;
}

export function deferTwoRequests(path?: string) {
  const firstResponse = deferred<Response>();
  const secondResponse = deferred<Response>();
  let requestCount = 0;
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    if (path !== undefined && requestPath(input) !== path) throw new Error(`Expected ${path}, got ${requestPath(input)}`);
    requestCount += 1;
    return await (requestCount === 1 ? firstResponse.promise : secondResponse.promise);
  });
  return { firstResponse, secondResponse, requestCount: () => requestCount };
}

export async function startConcurrentControllerActions(action: () => Promise<void>, path?: string) {
  const requests = deferTwoRequests(path);
  const first = await startControllerAction(action);
  const second = await startControllerAction(action);
  return { ...requests, first, second };
}

export async function startControllerAction(action: () => Promise<void>): Promise<PendingControllerAction> {
  let pending!: Promise<void>;
  await act(async () => { pending = action(); });
  return { pending };
}

export async function resolveControllerAction(action: PendingControllerAction, response: Deferred<Response>, body: unknown, status = 200): Promise<void> {
  response.resolve(jsonResponse(body, status));
  await act(async () => { await action.pending; });
}
