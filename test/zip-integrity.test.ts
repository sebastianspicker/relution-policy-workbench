import assert from "node:assert/strict";
import test from "node:test";
import { crc32, readZip, writeZip } from "../src/zip.js";

test("readZip rejects deflated entries whose declared CRC does not match the data", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  const centralOffset = archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.notEqual(centralOffset, -1);
  archive.writeUInt32LE(0xdeadbeef, 14);
  archive.writeUInt32LE(0xdeadbeef, centralOffset + 16);

  assert.throws(() => readZip(archive), /failed CRC verification/u);
});

test("readZip rejects stored entries whose declared CRC does not match the data", () => {
  const data = Buffer.from("stored payload");
  const archive = storedZip("payload.txt", data, (crc32(data) ^ 0xffffffff) >>> 0);

  assert.throws(() => readZip(archive), /failed CRC verification/u);
});

test("readZip rejects entries whose local and central filenames differ", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  archive[30] = "x".charCodeAt(0);

  assert.throws(() => readZip(archive), /inconsistent local and central filenames/u);
});

test("readZip rejects entries whose local and central sizes differ", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  archive.writeUInt32LE(0, 18);
  archive.writeUInt32LE(0, 22);

  assert.throws(() => readZip(archive), /inconsistent CRC or size headers/u);
});

test("readZip rejects a central directory whose declared size omits entry data", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]);
  const eocdOffset = archive.length - 22;
  archive.writeUInt32LE(46, eocdOffset + 12);

  assert.throws(() => readZip(archive), /Truncated ZIP central directory entry/u);
});

test("readZip validates deflate streams that declare an empty result", () => {
  const archive = writeZip([{ name: "payload.txt", data: Buffer.from("not empty") }]);
  const centralOffset = archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.notEqual(centralOffset, -1);
  archive.writeUInt32LE(0, 14);
  archive.writeUInt32LE(0, 22);
  archive.writeUInt32LE(0, centralOffset + 16);
  archive.writeUInt32LE(0, centralOffset + 24);

  assert.throws(() => readZip(archive), /larger than 1 bytes|unexpected inflated size/u);
});

function storedZip(name: string, data: Buffer, declaredCrc: number): Buffer {
  const nameBuffer = Buffer.from(name, "utf8");
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0x0800, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt32LE(declaredCrc, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuffer.length, 26);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0x0800, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt32LE(declaredCrc, 16);
  centralHeader.writeUInt32LE(data.length, 20);
  centralHeader.writeUInt32LE(data.length, 24);
  centralHeader.writeUInt16LE(nameBuffer.length, 28);
  centralHeader.writeUInt32LE(0, 42);

  const centralDirectoryOffset = localHeader.length + nameBuffer.length + data.length;
  const centralDirectorySize = centralHeader.length + nameBuffer.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  return Buffer.concat([localHeader, nameBuffer, data, centralHeader, nameBuffer, end]);
}
