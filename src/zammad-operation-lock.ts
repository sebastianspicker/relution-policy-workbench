/** Provides the short exclusive lock used around durable operation-store updates. */
import { join } from "node:path";
import { HttpError } from "./editor-http-input.js";
import { createPrivateDirectoryExclusive, removeEmptyPrivateDirectoryDurably } from "./utils/atomic-private-file.js";
import { hasErrorCode } from "./zammad-operation-file.js";
import { OPERATION_STORE_LOCK, operationsPath } from "./zammad-operation-paths.js";
import { assertOperationLockHeadroom } from "./zammad-operation-directory.js";

export function withOperationStoreLock<T>(workspace: string, action: () => T): T {
  const directoryPath = operationsPath(workspace);
  assertOperationLockHeadroom(directoryPath);
  const lockPath = join(directoryPath, OPERATION_STORE_LOCK);
  try {
    createPrivateDirectoryExclusive(lockPath, "Zammad operation store lock");
  } catch (error) {
    if (hasErrorCode(error, "EEXIST")) {
      throw new HttpError(503, "Zammad operation store is busy; retry after the other editor finishes. If no editor is running, remove the stale .capacity.lock directory only after confirming ticket creation has stopped.", true);
    }
    throw error;
  }
  let failed = false;
  let failure: unknown;
  let result: T | undefined;
  try { result = action(); } catch (error) { failed = true; failure = error; }
  try {
    removeEmptyPrivateDirectoryDurably(lockPath, "Zammad operation store lock");
  } catch (cleanupError) {
    if (failed) throw new AggregateError([failure, cleanupError], "Zammad operation claim and lock cleanup both failed");
    throw cleanupError;
  }
  if (failed) throw failure;
  return result as T;
}
