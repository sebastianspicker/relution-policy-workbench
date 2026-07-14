import assert from "node:assert/strict";
import test from "node:test";
import { runEditorMutation } from "../src/editor-mutation-routing.js";
import { HttpError } from "../src/editor-server-helpers.js";
import { BoundedOperationQueue, OperationQueueFullError } from "../src/utils/bounded-operation-queue.js";

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
