/** Verifies buffered Node responses preserve bounds, headers, and Fetch semantics. */
import assert from "node:assert/strict";
import { type IncomingMessage } from "node:http";
import test from "node:test";
import { Readable } from "node:stream";
import { incomingMessageToResponse } from "../src/http-service-incoming-response.js";

test("rejects an oversized declared response before stream iteration", async () => {
  let iterations = 0;
  const incoming = responseFrom((async function* (): AsyncGenerator<Buffer> {
    iterations += 1;
    yield Buffer.from("unread");
  })(), { "content-length": "5" });

  await assert.rejects(incomingMessageToResponse(incoming.message, 4), /response exceeds 4 bytes/u);

  assert.equal(iterations, 0);
  assert.deepEqual(incoming.destroyCalls, [undefined]);
});

test("rejects streamed overflow at the chunk boundary using byte length", async () => {
  const incoming = responseFrom([Buffer.from("ab"), Buffer.from("é"), Buffer.from("cd")]);

  await assert.rejects(incomingMessageToResponse(incoming.message, 5), /response exceeds 5 bytes/u);

  assert.deepEqual(incoming.destroyCalls, [undefined]);
});

test("accepts a response exactly at the configured byte limit", async () => {
  const response = await incomingMessageToResponse(responseFrom([Buffer.from("ab"), Buffer.from("é")]).message, 4);

  assert.equal(await response.text(), "abé");
});

test("returns null body for an empty response and preserves status and headers", async () => {
  const response = await incomingMessageToResponse(responseFrom([], {
    "x-scalar": "scalar",
    "x-array": ["first", "second"],
    "x-undefined": undefined,
  }, 201, "Created here").message, 10);

  assert.equal(response.status, 201);
  assert.equal(response.statusText, "Created here");
  assert.equal(response.body, null);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("x-scalar"), "scalar");
  assert.equal(response.headers.get("x-array"), "first, second");
  assert.equal(response.headers.has("x-undefined"), false);
});

function responseFrom(
  chunks: Iterable<Buffer> | AsyncIterable<Buffer>,
  headers: IncomingMessage["headers"] = {},
  statusCode = 200,
  statusMessage = "OK",
): { message: IncomingMessage; destroyCalls: Array<Error | undefined> } {
  const stream = Readable.from(chunks);
  const destroyCalls: Array<Error | undefined> = [];
  const originalDestroy = stream.destroy.bind(stream);
  stream.destroy = (error?: Error): Readable => {
    destroyCalls.push(error);
    return originalDestroy(error);
  };
  Object.assign(stream, { headers, statusCode, statusMessage });
  return { message: stream as IncomingMessage, destroyCalls };
}
