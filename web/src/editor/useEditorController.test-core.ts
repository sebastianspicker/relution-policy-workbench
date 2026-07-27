/** Common readiness and response helpers for controller tests. */
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import type { EditorControllerResult } from "./types.js";

export function currentReady(result: { current: EditorControllerResult }): Extract<EditorControllerResult, { kind: "ready" }> {
  if (result.current.kind !== "ready") throw new Error(`Expected ready controller, got ${result.current.kind}`);
  return result.current;
}

export async function waitForReady(
  _current: EditorControllerResult,
  result: { current: EditorControllerResult },
): Promise<void> {
  await waitFor(() => { expect(result.current.kind).toBe("ready"); });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
