/** Core ZIP integrity regressions. */
import assert from "node:assert/strict";
import test from "node:test";
import { crc32, readZip, writeZip } from "../src/zip.js";
import { centralDirectoryOffsetOf, storedZip, withTrailingCompressedByte } from "./zip-test-helpers.js";

test("readZip rejects deflated entries whose declared CRC does not match the data", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  const central = centralDirectoryOffsetOf(archive);
  archive.writeUInt32LE(0xdeadbeef, 14); archive.writeUInt32LE(0xdeadbeef, central + 16);
  assert.throws(() => readZip(archive), /failed CRC verification/u);
});

test("readZip rejects stored entries whose declared CRC does not match the data", () => {
  const data = Buffer.from("stored payload");
  assert.throws(() => readZip(storedZip("payload.txt", data, (crc32(data) ^ 0xffffffff) >>> 0)), /failed CRC verification/u);
});

test("readZip rejects mismatched local names and sizes", () => {
  const named = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  named[30] = "x".charCodeAt(0);
  assert.throws(() => readZip(named), /inconsistent local and central filenames/u);
  const sized = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  sized.writeUInt32LE(0, 18); sized.writeUInt32LE(0, 22);
  assert.throws(() => readZip(sized), /inconsistent CRC or size headers/u);
});

test("readZip rejects invalid central-directory sizes and deflate output claims", () => {
  const directory = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  directory.writeUInt32LE(46, directory.length - 22 + 12);
  assert.throws(() => readZip(directory), /ZIP central directory must end at the end-of-central-directory record/u);
  const inflated = writeZip([{ name: "payload.txt", data: Buffer.from("not empty") }]);
  const central = centralDirectoryOffsetOf(inflated);
  inflated.fill(0, 14, 26); inflated.fill(0, central + 16, central + 28);
  assert.throws(() => readZip(inflated), /larger than 1 bytes|unexpected inflated size|unexpected end of file/u);
});

test("readZip rejects trailing bytes inside a deflate stream", () => {
  assert.throws(() => readZip(withTrailingCompressedByte(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]))), /contains trailing compressed data/u);
});
