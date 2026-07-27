/** Covers queue admission, concurrency limits, aborts, and close semantics. */
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  closeEditorMutationQueues,
  createEditorMutationQueues,
  editorMutationRequestCancellation,
  editorMutationQueueForPath,
  runEditorMutation,
} from "../src/editor-mutation-routing.js";
import { HttpError } from "../src/editor-http-input.js";
import {
  BoundedOperationQueue,
  OperationQueueAbortedError,
  OperationQueueClosedError,
  OperationQueueFullError,
} from "../src/utils/bounded-operation-queue.js";

test("BoundedOperationQueue serializes operations in arrival order", async () => {
  const queue = new BoundedOperationQueue(3);
  const events: string[] = [];
  let releaseFirst = (): void => undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = queue.run(async () => {
    events.push("first:start");
    await firstGate;
    events.push("first:end");
  });
  const second = queue.run(() => {
    events.push("second");
  });
  await Promise.resolve();
  assert.deepEqual(events, ["first:start"]);
  assert.equal(queue.pendingCount, 2);

  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["first:start", "first:end", "second"]);
  assert.equal(queue.pendingCount, 0);
});

test("editor mutation routing exposes an actionable 503 when the queue is full", async () => {
  const queue = new BoundedOperationQueue(1);
  let release = (): void => undefined;
  const blocker = new Promise<void>((resolve) => { release = resolve; });
  const running = runEditorMutation(queue, async () => await blocker);

  await assert.rejects(
    runEditorMutation(queue, async () => undefined),
    (error) => error instanceof HttpError && error.status === 503 && error.expose && /queue is full/i.test(error.message),
  );
  release();
  await running;
});

test("BoundedOperationQueue rejects excess work without poisoning later operations", async () => {
  const queue = new BoundedOperationQueue(1);
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = queue.run(async () => await gate);
  await assert.rejects(queue.run(() => undefined), OperationQueueFullError);
  release();
  await first;
  await assert.doesNotReject(queue.run(() => undefined));
});

test("slow service mutations do not block workspace or other service mutations", async () => {
  const queues = createEditorMutationQueues(2);
  let releaseRelution = (): void => undefined;
  const relutionGate = new Promise<void>((resolve) => {
    releaseRelution = resolve;
  });
  const relution = runEditorMutation(
    editorMutationQueueForPath("/api/relution/devices/query", queues),
    async () => await relutionGate,
  );

  const completed: string[] = [];
  await Promise.all([
    runEditorMutation(editorMutationQueueForPath("/api/workspace", queues), async () => {
      completed.push("workspace");
    }),
    runEditorMutation(editorMutationQueueForPath("/api/zammad/tickets/query", queues), async () => {
      completed.push("zammad");
    }),
  ]);

  assert.deepEqual(completed.sort(), ["workspace", "zammad"]);
  assert.equal(queues.relution.pendingCount, 1);
  releaseRelution();
  await relution;
});

test("aborting a waiting operation removes it without overtaking active work", async () => {
  const queue = new BoundedOperationQueue(2);
  const events: string[] = [];
  let releaseFirst = (): void => undefined;
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const first = queue.run(async () => {
    events.push("first:start");
    await firstGate;
    events.push("first:end");
  });
  const controller = new AbortController();
  const cancelled = queue.run(() => { events.push("cancelled"); }, { signal: controller.signal });

  assert.equal(queue.pendingCount, 2);
  controller.abort(new OperationQueueAbortedError("request disconnected"));
  await assert.rejects(cancelled, OperationQueueAbortedError);
  assert.equal(queue.pendingCount, 1, "cancelling a waiter must free queue capacity immediately");
  assert.equal(queue.waitingCount, 0, "cancelling a waiter must release its operation closure immediately");

  const later = queue.run(() => { events.push("later"); });
  assert.deepEqual(events, ["first:start"]);
  releaseFirst();
  await Promise.all([first, later]);
  assert.deepEqual(events, ["first:start", "first:end", "later"]);
  assert.equal(queue.pendingCount, 0);
});

test("repeated waiter cancellation cannot grow retained queue entries", async () => {
  const queue = new BoundedOperationQueue(2);
  let releaseActive = (): void => undefined;
  const activeGate = new Promise<void>((resolve) => { releaseActive = resolve; });
  const active = queue.run(async () => await activeGate);

  for (let index = 0; index < 1_000; index += 1) {
    const controller = new AbortController();
    const waiting = queue.run(() => index, { signal: controller.signal });
    controller.abort(new OperationQueueAbortedError());
    await assert.rejects(waiting, OperationQueueAbortedError);
    assert.equal(queue.waitingCount, 0);
  }
  assert.equal(queue.pendingCount, 1);
  releaseActive();
  await active;
});

test("aborting after admission does not interrupt an active operation", async () => {
  const queue = new BoundedOperationQueue(1);
  const controller = new AbortController();
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const active = queue.run(async () => {
    await gate;
    return "definite outcome";
  }, { signal: controller.signal });

  controller.abort(new OperationQueueAbortedError("too late"));
  release();
  assert.equal(await active, "definite outcome");
  assert.equal(queue.pendingCount, 0);
});

test("an already-aborted operation is never admitted", async () => {
  const queue = new BoundedOperationQueue(1);
  const controller = new AbortController();
  controller.abort(new OperationQueueAbortedError());
  let ran = false;

  await assert.rejects(queue.run(() => { ran = true; }, { signal: controller.signal }), OperationQueueAbortedError);
  assert.equal(ran, false);
  assert.equal(queue.pendingCount, 0);
});

test("closing a queue cancels waiters, rejects new work, and drains active work", async () => {
  const queue = new BoundedOperationQueue(2);
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const active = queue.run(async () => await gate);
  const waiting = queue.run(() => undefined);
  let closeResolved = false;
  const closing = queue.close().then(() => { closeResolved = true; });

  await assert.rejects(waiting, OperationQueueClosedError);
  await assert.rejects(queue.run(() => undefined), OperationQueueClosedError);
  await Promise.resolve();
  assert.equal(closeResolved, false);
  assert.equal(queue.pendingCount, 1);
  release();
  await active;
  await closing;
  assert.equal(queue.pendingCount, 0);
  await assert.doesNotReject(queue.close(), "repeated close calls must be safe");
});

test("request lifecycle cancellation distinguishes normal completion from disconnects", () => {
  const normalRequest = lifecycleRequest(true, false);
  const normalResponse = lifecycleResponse(true, false);
  const normal = editorMutationRequestCancellation(normalRequest as never, normalResponse as never);
  normalRequest.emit("close");
  normalResponse.emit("close");
  assert.equal(normal.signal.aborted, false);
  normal.dispose();

  const partialRequest = lifecycleRequest(false, false);
  const partialResponse = lifecycleResponse(false, false);
  const partial = editorMutationRequestCancellation(partialRequest as never, partialResponse as never);
  partialRequest.emit("close");
  assert.equal(partial.signal.reason instanceof OperationQueueAbortedError, true);
  partial.dispose();

  const completedRequest = lifecycleRequest(true, false);
  const abandonedResponse = lifecycleResponse(false, false);
  const abandoned = editorMutationRequestCancellation(completedRequest as never, abandonedResponse as never);
  abandonedResponse.emit("close");
  assert.equal(abandoned.signal.reason instanceof OperationQueueAbortedError, true);
  abandoned.dispose();
});

test("request lifecycle cancellation detects a disconnect that predates listener registration", () => {
  const lifecycle = editorMutationRequestCancellation(
    lifecycleRequest(true, false) as never,
    lifecycleResponse(false, true) as never,
  );
  assert.equal(lifecycle.signal.reason instanceof OperationQueueAbortedError, true);
  lifecycle.dispose();
});

test("a fully transmitted disconnected ticket request never reaches its queued mutation", async () => {
  const queue = new BoundedOperationQueue(2);
  let releaseActive = (): void => undefined;
  const activeGate = new Promise<void>((resolve) => { releaseActive = resolve; });
  const active = runEditorMutation(queue, async () => await activeGate);
  const request = lifecycleRequest(true, false);
  const response = lifecycleResponse(false, false);
  const cancellation = editorMutationRequestCancellation(request as never, response as never);
  let createdTickets = 0;
  const ticket = runEditorMutation(queue, async () => {
    createdTickets += 1;
  }, { signal: cancellation.signal });

  response.emit("close");
  await assert.rejects(ticket, OperationQueueAbortedError);
  releaseActive();
  await active;
  cancellation.dispose();
  assert.equal(createdTickets, 0);
});

test("editor shutdown cancels queued mutations and waits for active work", async () => {
  const queues = createEditorMutationQueues(2);
  let releaseActive = (): void => undefined;
  const activeGate = new Promise<void>((resolve) => { releaseActive = resolve; });
  let activeRuns = 0;
  let queuedRuns = 0;
  const active = runEditorMutation(queues.zammad, async () => {
    activeRuns += 1;
    await activeGate;
  });
  const queued = runEditorMutation(queues.zammad, async () => {
    queuedRuns += 1;
  });
  let shutdownResolved = false;
  const shutdown = closeEditorMutationQueues(queues).then(() => { shutdownResolved = true; });

  await assert.rejects(queued, (error) => error instanceof HttpError && error.status === 503);
  await Promise.resolve();
  assert.equal(shutdownResolved, false);
  assert.equal(activeRuns, 1);
  assert.equal(queuedRuns, 0);
  releaseActive();
  await active;
  await shutdown;
  assert.equal(shutdownResolved, true);
});

function lifecycleRequest(complete: boolean, destroyed: boolean): EventEmitter & { complete: boolean; destroyed: boolean } {
  return Object.assign(new EventEmitter(), { complete, destroyed });
}

function lifecycleResponse(writableFinished: boolean, destroyed: boolean): EventEmitter & { writableFinished: boolean; destroyed: boolean } {
  return Object.assign(new EventEmitter(), { writableFinished, destroyed });
}
