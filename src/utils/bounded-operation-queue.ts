export class OperationQueueFullError extends Error {
  constructor(maxPending: number) {
    super(`Operation queue is full (${String(maxPending)} pending requests)`);
    this.name = "OperationQueueFullError";
  }
}

export class BoundedOperationQueue {
  readonly #maxPending: number;
  #pending = 0;
  #tail: Promise<void> = Promise.resolve();

  constructor(maxPending: number) {
    if (!Number.isSafeInteger(maxPending) || maxPending < 1) {
      throw new Error("Operation queue limit must be a positive safe integer");
    }
    this.#maxPending = maxPending;
  }

  get pendingCount(): number {
    return this.#pending;
  }

  async run<T>(operation: () => Promise<T> | T): Promise<T> {
    if (this.#pending >= this.#maxPending) {
      throw new OperationQueueFullError(this.#maxPending);
    }
    this.#pending += 1;
    const previous = this.#tail;
    let release = (): void => undefined;
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      this.#pending -= 1;
      release();
    }
  }
}
