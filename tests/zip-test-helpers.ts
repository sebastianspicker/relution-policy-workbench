/** Small archive mutations used by ZIP structural regression suites. */
import assert from "node:assert/strict";
import { crc32, writeZip } from "../src/zip.js";

export function centralDirectoryOffsetOf(archive: Buffer): number {
  return archive.readUInt32LE(archive.length - 22 + 16);
}

export function reverseCentralDirectoryEntries(archive: Buffer): Buffer {
  const centralDirectoryOffset = centralDirectoryOffsetOf(archive);
  const eocdOffset = archive.length - 22;
  const records: Buffer[] = [];
  for (let cursor = centralDirectoryOffset; cursor < eocdOffset;) {
    const end = cursor + 46 + archive.readUInt16LE(cursor + 28) + archive.readUInt16LE(cursor + 30) + archive.readUInt16LE(cursor + 32);
    records.push(archive.subarray(cursor, end));
    cursor = end;
  }
  assert.equal(Buffer.concat(records).length, eocdOffset - centralDirectoryOffset);
  return Buffer.concat([archive.subarray(0, centralDirectoryOffset), ...records.reverse(), archive.subarray(eocdOffset)]);
}

export function withCentralExtraField(archive: Buffer): Buffer {
  const central = centralDirectoryOffsetOf(archive);
  const extraOffset = central + 46 + archive.readUInt16LE(central + 28);
  archive.writeUInt16LE(1, central + 30);
  const modified = insertByte(archive, extraOffset);
  modified.writeUInt32LE(archive.readUInt32LE(archive.length - 22 + 12) + 1, modified.length - 22 + 12);
  return modified;
}

export function withLocalExtraField(archive: Buffer): Buffer {
  const central = centralDirectoryOffsetOf(archive);
  const extraOffset = 30 + archive.readUInt16LE(26);
  archive.writeUInt16LE(1, 28);
  const modified = insertByte(archive, extraOffset);
  modified.writeUInt32LE(central + 1, modified.length - 22 + 16);
  return modified;
}

function insertByte(archive: Buffer, offset: number): Buffer {
  return Buffer.concat([archive.subarray(0, offset), Buffer.from([0]), archive.subarray(offset)]);
}

export function withDataDescriptor(archive: Buffer): Buffer {
  const central = centralDirectoryOffsetOf(archive);
  const descriptor = Buffer.alloc(16);
  descriptor.writeUInt32LE(0x08074b50, 0);
  descriptor.writeUInt32LE(archive.readUInt32LE(central + 16), 4);
  descriptor.writeUInt32LE(archive.readUInt32LE(central + 20), 8);
  descriptor.writeUInt32LE(archive.readUInt32LE(central + 24), 12);
  archive.writeUInt16LE(archive.readUInt16LE(6) | 0x0008, 6);
  archive.fill(0, 14, 26);
  archive.writeUInt16LE(archive.readUInt16LE(central + 8) | 0x0008, central + 8);
  const modified = Buffer.concat([archive.subarray(0, central), descriptor, archive.subarray(central)]);
  modified.writeUInt32LE(central + descriptor.length, modified.length - 22 + 16);
  return modified;
}

export function withTrailingCompressedByte(archive: Buffer): Buffer {
  const central = centralDirectoryOffsetOf(archive);
  const compressedSize = archive.readUInt32LE(18);
  const dataEnd = 30 + archive.readUInt16LE(26) + compressedSize;
  const modified = Buffer.concat([archive.subarray(0, dataEnd), Buffer.from([0]), archive.subarray(dataEnd)]);
  modified.writeUInt32LE(compressedSize + 1, 18);
  modified.writeUInt32LE(compressedSize + 1, central + 1 + 20);
  modified.writeUInt32LE(central + 1, modified.length - 22 + 16);
  return modified;
}

export function archiveWithComment(): Buffer {
  const archive = Buffer.concat([writeZip([{ name: "payload.txt", data: Buffer.from("trusted payload") }]), Buffer.from("hidden")]);
  archive.writeUInt16LE(6, archive.length - 22 - 6 + 20);
  return archive;
}

export function removeDescriptorSignature(archive: Buffer): Buffer {
  const central = centralDirectoryOffsetOf(archive);
  const modified = Buffer.concat([archive.subarray(0, central - 16), archive.subarray(central - 12)]);
  modified.writeUInt32LE(central - 4, modified.length - 22 + 16);
  return modified;
}

export function storedZip(name: string, data: Buffer, declaredCrc = crc32(data)): Buffer {
  const nameBuffer = Buffer.from(name, "utf8");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt32LE(declaredCrc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuffer.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt32LE(declaredCrc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuffer.length, 28);
  const offset = local.length + nameBuffer.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + nameBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([local, nameBuffer, data, central, nameBuffer, end]);
}
