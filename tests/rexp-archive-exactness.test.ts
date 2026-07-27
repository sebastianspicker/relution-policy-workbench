/** Ensures REXP archives retain the canonical ZIP structure expected by Relution. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { decryptRelutionPayload, encryptRelutionPayload, extractRexp, inspectRexp, packPlainDirectory, verifyRexp } from "../src/rexp.js";
import { readZip, writeZip } from "../src/zip.js";
import { deterministicRandomBytes, fixture, password } from "./rexp-helpers.js";

test("rejects unaccounted ZIP entries across inspection, verification, and extraction", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-unaccounted-entry-"));
  const archive = join(root, "unaccounted.rexp");
  const output = join(root, "output");
  const entries = readZip(readFileSync(fixture));
  writeFileSync(archive, writeZip([...entries, { name: "unaccounted-forensic-payload.bin", data: Buffer.from("forensic") }]));

  assert.throws(() => inspectRexp(archive), /outside the managed REXP format: unaccounted-forensic-payload\.bin/u);
  assert.throws(() => verifyRexp(archive, password), /outside the managed REXP format: unaccounted-forensic-payload\.bin/u);
  assert.throws(() => extractRexp(archive, output, password), /outside the managed REXP format: unaccounted-forensic-payload\.bin/u);
});

test("rejects hidden ZIP gaps across inspection, verification, and extraction", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-hidden-gap-"));
  const extracted = join(root, "extracted");
  const rebuilt = join(root, "roundtrip.rexp");
  const archive = join(root, "hidden-gap.rexp");
  const output = join(root, "output");

  extractRexp(fixture, extracted, password);
  packPlainDirectory(extracted, rebuilt, password, { randomBytes: deterministicRandomBytes() });
  const original = readFileSync(rebuilt);
  const centralDirectoryOffset = original.readUInt32LE(original.length - 22 + 16);
  const hidden = Buffer.from("unaccounted forensic payload");
  const modified = Buffer.concat([original.subarray(0, centralDirectoryOffset), hidden, original.subarray(centralDirectoryOffset)]);
  modified.writeUInt32LE(centralDirectoryOffset + hidden.length, modified.length - 22 + 16);
  writeFileSync(archive, modified);

  assert.throws(() => inspectRexp(archive), /ZIP local records are not contiguous before the central directory/u);
  assert.throws(() => verifyRexp(archive, password), /ZIP local records are not contiguous before the central directory/u);
  assert.throws(() => extractRexp(archive, output, password), /ZIP local records are not contiguous before the central directory/u);
});

test("rejects unexpected metadata.bin hash keys across inspection, verification, and extraction", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-unexpected-hash-"));
  const archive = join(root, "unexpected-hash.rexp");
  const output = join(root, "output");
  const entries = readZip(readFileSync(fixture)).map((entry) => {
    if (entry.name !== "metadata.bin") return entry;
    const hashes = JSON.parse(decryptRelutionPayload(entry.data, password).toString("utf8")) as Record<string, string>;
    hashes["metadata.bin"] = "unaccounted";
    return {
      name: entry.name,
      data: encryptRelutionPayload(Buffer.from(JSON.stringify(hashes), "utf8"), password, deterministicRandomBytes()),
    };
  });
  writeFileSync(archive, writeZip(entries));

  assert.throws(() => inspectRexp(archive, password), /Archive hash map references path outside extraction root or managed surface: metadata\.bin/u);
  assert.throws(() => verifyRexp(archive, password), /Archive hash map references path outside extraction root or managed surface: metadata\.bin/u);
  assert.throws(() => extractRexp(archive, output, password), /Archive hash map references path outside extraction root or managed surface: metadata\.bin/u);
});
