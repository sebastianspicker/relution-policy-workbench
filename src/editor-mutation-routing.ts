import type { Server } from "node:http";
import { HttpError } from "./editor-server-helpers.js";
import { BoundedOperationQueue, OperationQueueFullError } from "./utils/bounded-operation-queue.js";

export async function runEditorMutation<T>(queue: BoundedOperationQueue, operation: () => Promise<T>): Promise<T> {
  try {
    return await queue.run(operation);
  } catch (error) {
    if (error instanceof OperationQueueFullError) {
      throw new HttpError(503, error.message, true);
    }
    throw error;
  }
}

export function configureEditorHttpServer(server: Server): void {
  server.requestTimeout = 60_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 100;
  server.maxRequestsPerSocket = 100;
}
