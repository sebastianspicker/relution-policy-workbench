/** Characterizes strict Zammad operation-record persistence boundaries. */
import assert from "node:assert/strict";
import test from "node:test";
import { parseOperation } from "../src/zammad-operation-record.js";

const OPERATION_ID = `relution-op-${"a".repeat(64)}`;
const UPDATED_AT = "2026-08-05T12:34:56.789Z";

test("parseOperation accepts an exact started record", () => {
  const record = { version: 1, id: OPERATION_ID, state: "started", updatedAt: UPDATED_AT };

  assert.deepEqual(parseOperation(record, OPERATION_ID), record);
});

test("parseOperation accepts completed ticket-result identifier variants", () => {
  for (const result of [{ id: 42 }, { number: "240042" }, { id: 42, number: "240042" }]) {
    const record = { version: 1, id: OPERATION_ID, state: "completed" as const, updatedAt: UPDATED_AT, result };

    assert.deepEqual(parseOperation(record, OPERATION_ID), record);
  }
});

test("parseOperation rejects invalid operation-record boundaries", () => {
  const validRecord = { version: 1, id: OPERATION_ID, state: "started", updatedAt: UPDATED_AT };
  const invalidRecords = [
    null,
    [],
    { ...validRecord, extra: true },
    { ...validRecord, updatedAt: "2026-08-05T12:34:56Z" },
    { ...validRecord, id: `relution-op-${"b".repeat(64)}` },
  ];

  for (const record of invalidRecords) {
    assert.throws(() => parseOperation(record, OPERATION_ID), { message: "Invalid Zammad operation record" });
  }
});

test("parseOperation preserves persisted ticket-result validation errors", () => {
  const invalidResults = [
    [{}, "Invalid Zammad ticket result"],
    [{ id: undefined }, "Missing Zammad ticket identifier"],
    [{ id: 0 }, "Invalid Zammad ticket id"],
    [{ number: " " }, "Invalid Zammad ticket number"],
    [{ id: 42, extra: true }, "Invalid Zammad ticket result"],
  ] as const;

  for (const [result, message] of invalidResults) {
    const record = { version: 1, id: OPERATION_ID, state: "completed" as const, updatedAt: UPDATED_AT, result };

    assert.throws(() => parseOperation(record, OPERATION_ID), { message });
  }
});
