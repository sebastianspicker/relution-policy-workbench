/** Strict-layout and general ZIP compatibility regressions. */
import assert from "node:assert/strict";
import test from "node:test";
import { readZip, writeZip } from "../src/zip.js";
import { archiveWithComment, centralDirectoryOffsetOf, removeDescriptorSignature, reverseCentralDirectoryEntries, withCentralExtraField, withDataDescriptor, withLocalExtraField } from "./zip-test-helpers.js";

test("strict layout rejects hidden gaps and ZIP comments or extra fields", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  const central = centralDirectoryOffsetOf(archive); const hidden = Buffer.from("unaccounted forensic payload");
  const gap = Buffer.concat([archive.subarray(0, central), hidden, archive.subarray(central)]);
  gap.writeUInt32LE(central + hidden.length, gap.length - 22 + 16);
  assert.equal(readZip(gap)[0]?.name, "payload.txt");
  assert.throws(() => readZip(gap, { strictLayout: true }), /ZIP local records are not contiguous before the central directory/u);
  const comment = archiveWithComment();
  assert.throws(() => readZip(comment, { strictLayout: true }), /ZIP archive comments are not supported/u);
  assert.throws(() => readZip(withCentralExtraField(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }])), { strictLayout: true }), /ZIP central directory extra fields are not supported/u);
  assert.throws(() => readZip(withLocalExtraField(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }])), { strictLayout: true }), /ZIP local extra fields are not supported/u);
});

test("strict layout validates signed and signatureless descriptors without constraining timestamps", () => {
  const signed = withDataDescriptor(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]));
  assert.equal(readZip(signed, { strictLayout: true })[0]?.name, "payload.txt");
  const corrupted = Buffer.from(signed); corrupted.writeUInt32LE(0, centralDirectoryOffsetOf(corrupted) - 12);
  assert.throws(() => readZip(corrupted, { strictLayout: true }), /inconsistent data descriptor/u);
  const unsigned = removeDescriptorSignature(signed); const central = centralDirectoryOffsetOf(unsigned);
  unsigned.writeUInt16LE(0x7fff, 10); unsigned.writeUInt16LE(0x7fff, central + 12);
  assert.equal(readZip(unsigned, { strictLayout: true })[0]?.name, "payload.txt");
});

test("general ZIP mode allows standard comments, extra fields, and descriptors", () => {
  const comment = archiveWithComment();
  assert.equal(readZip(comment)[0]?.name, "payload.txt");
  assert.equal(readZip(withCentralExtraField(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }])))[0]?.name, "payload.txt");
  assert.equal(readZip(withLocalExtraField(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }])))[0]?.name, "payload.txt");
  assert.equal(readZip(withDataDescriptor(writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }])))[0]?.name, "payload.txt");
});

test("strict layout preserves central-directory order even when local offsets differ", () => {
  const archive = writeZip([{ name: "first.txt", data: Buffer.from("first") }, { name: "second.txt", data: Buffer.from("second") }]);
  assert.deepEqual(readZip(reverseCentralDirectoryEntries(archive), { strictLayout: true }).map((entry) => entry.name), ["second.txt", "first.txt"]);
});
