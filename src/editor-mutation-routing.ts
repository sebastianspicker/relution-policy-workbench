/** Routes authenticated editor mutations to their owning feature handlers. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError } from "./editor-http-input.js";
import {
  BoundedOperationQueue,
  OperationQueueAbortedError,
  OperationQueueClosedError,
  OperationQueueFullError,
} from "./utils/bounded-operation-queue.js";

export interface EditorMutationQueues {
  readonly workspace: BoundedOperationQueue;
  readonly relution: BoundedOperationQueue;
  readonly zammad: BoundedOperationQueue;
}

export function createEditorMutationQueues(maxPending: number): EditorMutationQueues {
  return {
    workspace: new BoundedOperationQueue(maxPending),
    relution: new BoundedOperationQueue(maxPending),
    zammad: new BoundedOperationQueue(maxPending),
  };
}

export function editorMutationQueueForPath(pathname: string, queues: EditorMutationQueues): BoundedOperationQueue {
  if (pathname.startsWith("/api/relution/")) return queues.relution;
  if (pathname.startsWith("/api/zammad/")) return queues.zammad;
  return queues.workspace;
}

export async function runEditorMutation<T>(
  queue: BoundedOperationQueue,
  operation: () => Promise<T>,
  options: { readonly signal?: AbortSignal } = {},
): Promise<T> {
  try {
    return await queue.run(operation, options);
  } catch (error) {
    if (error instanceof OperationQueueFullError) {
      throw new HttpError(503, error.message, true);
    }
    if (error instanceof OperationQueueClosedError) {
      throw new HttpError(503, "Editor server is shutting down", true);
    }
    throw error;
  }
}

export async function closeEditorMutationQueues(queues: EditorMutationQueues): Promise<void> {
  await Promise.all(Object.values(queues).map(async (queue) => await queue.close()));
}

export function editorMutationRequestCancellation(
  request: IncomingMessage,
  response: ServerResponse,
): { readonly signal: AbortSignal; readonly dispose: () => void } {
  const controller = new AbortController();
  const abort = (): void => {
    if (!controller.signal.aborted) {
      controller.abort(new OperationQueueAbortedError("Editor request disconnected before its mutation started"));
    }
  };
  const onRequestClose = (): void => {
    if (!request.complete) abort();
  };
  const onResponseClose = (): void => {
    if (!response.writableFinished) abort();
  };
  request.once("close", onRequestClose);
  response.once("close", onResponseClose);
  if ((request.destroyed && !request.complete) || (response.destroyed && !response.writableFinished)) abort();
  return {
    signal: controller.signal,
    dispose: () => {
      request.off("close", onRequestClose);
      response.off("close", onResponseClose);
    },
  };
}

export function isEditorMutationCancellation(error: unknown): boolean {
  return error instanceof OperationQueueAbortedError;
}
