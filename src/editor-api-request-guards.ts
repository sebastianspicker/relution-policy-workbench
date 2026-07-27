/** Applies the editor API capability, authority, origin, and content-type guards. */
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { EditorServerOptions } from "./editor-server-contract.js";
import { HttpError } from "./editor-http-input.js";
import { assertSameOrigin, requireLoopbackRequestHost, type SafeApiRequestHost } from "./editor-http-authority.js";

/** Creates an unguessable per-session token for the loopback editor API. */
export function createNetworkApiToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Checks the capability token before exposing local API host-policy details. */
export function assertAuthorizedEditorApiRequest(
  request: IncomingMessage,
  options: EditorServerOptions,
  token: string,
): SafeApiRequestHost {
  assertNetworkApiToken(request, token);
  return assertSafeApiRequestHost(request, options);
}

/**
 * Retains the historical helper contract while enforcing the current
 * loopback-only transport policy regardless of legacy network options.
 */
function assertSafeApiRequestHost(
  request: IncomingMessage,
  _options: EditorServerOptions,
  label = "Editor API requests",
): SafeApiRequestHost {
  return requireLoopbackRequestHost(request, label);
}

/** Requires same-origin JSON mutations after the capability and Host checks. */
export function assertSafeMutatingApiRequest(
  request: IncomingMessage,
  _options: EditorServerOptions,
  requestHost = requireLoopbackRequestHost(request, "Mutating editor API requests"),
): void {
  assertSameOrigin(request, requestHost.host);
  assertJsonContentType(request);
}

/** Retains the historical export but fails closed when no token is supplied. */
function assertNetworkApiToken(request: IncomingMessage, token: string | undefined): void {
  const headerToken = firstHeaderValue(request.headers["x-rexp-studio-token"]);
  if (token !== undefined && typeof headerToken === "string" && constantTimeStringEqual(headerToken, token)) return;
  throw new HttpError(403, "Editor API requests require the editor token");
}

function constantTimeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(rightBuffer, rightBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function assertJsonContentType(request: IncomingMessage): void {
  const contentType = firstHeaderValue(request.headers["content-type"]);
  if (contentType === undefined || !/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    throw new HttpError(415, "Mutating editor API requests require Content-Type: application/json");
  }
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
