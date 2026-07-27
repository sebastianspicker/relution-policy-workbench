/** Classifies editor requests, applies guards, and schedules mutations. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { isEditorApiPath } from "./editor-api-namespaces.js";
import { assertAuthorizedEditorApiRequest, assertSafeMutatingApiRequest } from "./editor-api-request-guards.js";
import { badRequest } from "./editor-http-input.js";
import {
  editorMutationRequestCancellation,
  editorMutationQueueForPath,
  runEditorMutation,
} from "./editor-mutation-routing.js";
import { sendJson } from "./editor-routes-utils.js";
import type { EditorRequestContext } from "./editor-server-contract.js";
import { routeEditorApiRequest } from "./editor-server-routes.js";
import { serveStaticAsset } from "./editor-static-assets.js";

const STATIC_ROOT = fileURLToPath(new URL("../../dist-web", import.meta.url));

export async function handleEditorHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): Promise<void> {
  const url = parseEditorRequestUrl(request.url);
  if (isEditorApiPath(url.pathname)) {
    await handleEditorApiHttpRequest(url, request, response, context);
    return;
  }
  serveStaticAsset(STATIC_ROOT, url.pathname, response);
}

export function parseEditorRequestUrl(requestTarget: string | undefined): URL {
  try {
    return new URL(requestTarget ?? "/", "http://localhost");
  } catch {
    throw badRequest("Invalid editor request target");
  }
}

async function handleEditorApiHttpRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): Promise<void> {
  const requestHost = assertAuthorizedEditorApiRequest(request, context.options, context.runtimeState.networkApiToken);
  if (request.method === "POST") {
    assertSafeMutatingApiRequest(request, context.options, requestHost);
    await runQueuedEditorMutation(url, request, response, context);
    return;
  }
  await sendUnknownApiRoute(url, request, response, context);
}

async function runQueuedEditorMutation(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): Promise<void> {
  const queue = editorMutationQueueForPath(url.pathname, context.runtimeState.mutationQueues);
  const cancellation = editorMutationRequestCancellation(request, response);
  try {
    await sendUnknownApiRoute(url, request, response, context, queue, cancellation.signal);
  } finally {
    cancellation.dispose();
  }
}

async function sendUnknownApiRoute(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
  queue?: ReturnType<typeof editorMutationQueueForPath>,
  signal?: AbortSignal,
): Promise<void> {
  const handled = queue === undefined
    ? await routeEditorApiRequest(url, request, response, context)
    : await runEditorMutation(
      queue,
      async () => await routeEditorApiRequest(url, request, response, context),
      signal === undefined ? {} : { signal },
    );
  if (handled) return;
  sendJson(response, 404, { error: `Unknown API endpoint: ${request.method ?? "GET"} ${url.pathname}` });
}
