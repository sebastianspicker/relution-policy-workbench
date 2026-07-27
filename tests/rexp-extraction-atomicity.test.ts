/** Proves failed REXP extraction does not partially replace destination files. */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { decryptRelutionPayload, encryptRelutionPayload, extractRexp, packPlainDirectory } from "../src/rexp.js";
import { readZip, writeZip } from "../src/zip.js";
import { deterministicRandomBytes, fixture, password } from "./rexp-helpers.js";

test("extractRexp with force rejects a symlinked output root without touching its target", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-symlinked-output-"));
  const target = join(root, "target");
  const output = join(root, "extracted");
  const marker = join(target, "must-not-change.txt");
  mkdirSync(target);
  writeFileSync(marker, "unchanged\n");
  symlinkSync(target, output);

  assert.throws(() => extractRexp(fixture, output, password, { force: true }), /Output path must not use symlinks/u);
  assert.equal(readFileSync(marker, "utf8"), "unchanged\n");
  assert.equal(existsSync(join(target, "metadata.json")), false);
});

test("extractRexp rejects a symlinked output ancestor without touching its target", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-symlinked-output-parent-"));
  const target = join(root, "target");
  const alias = join(root, "alias");
  mkdirSync(target);
  symlinkSync(target, alias);

  assert.throws(() => extractRexp(fixture, join(alias, "extracted"), password, { force: true }), /Output path must not use symlinks/u);
  assert.equal(existsSync(join(target, "extracted", "metadata.json")), false);
});

test("extractRexp rejects a dangling symlink in the output ancestry", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-dangling-output-parent-"));
  const alias = join(root, "dangling");
  symlinkSync(join(root, "missing-target"), alias);

  assert.throws(() => extractRexp(fixture, join(alias, "extracted"), password, { force: true }), /Output path must not use symlinks/u);
  assert.equal(existsSync(join(root, "missing-target")), false);
});

test("packPlainDirectory rejects symlinked output paths without touching their targets", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-symlinked-pack-output-"));
  const workspace = join(root, "workspace");
  const target = join(root, "target.rexp");
  const output = join(root, "output.rexp");
  extractRexp(fixture, workspace, password);
  writeFileSync(target, "unchanged\n");
  symlinkSync(target, output);

  assert.throws(() => packPlainDirectory(workspace, output, password, { force: true }), /Archive output path must not use symlinks/u);
  assert.equal(readFileSync(target, "utf8"), "unchanged\n");
});

test("packPlainDirectory rejects symlinked output ancestors", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-symlinked-pack-parent-"));
  const workspace = join(root, "workspace");
  const target = join(root, "target");
  const alias = join(root, "alias");
  extractRexp(fixture, workspace, password);
  mkdirSync(target);
  symlinkSync(target, alias);

  assert.throws(() => packPlainDirectory(workspace, join(alias, "output.rexp"), password), /Archive output path must not use symlinks/u);
  assert.equal(existsSync(join(target, "output.rexp")), false);
});

test("packPlainDirectory without force never clobbers an existing output", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-no-clobber-"));
  const workspace = join(root, "workspace");
  const output = join(root, "output.rexp");
  extractRexp(fixture, workspace, password);
  writeFileSync(output, "existing archive\n");

  assert.throws(() => packPlainDirectory(workspace, output, password), /already exists/u);
  assert.equal(readFileSync(output, "utf8"), "existing archive\n");
  assert.deepEqual(readdirSync(root).filter((name) => name.includes(".tmp")), []);
});

test("extracted plaintext and packed archives use private filesystem modes", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-private-modes-"));
  const workspace = join(root, "workspace");
  const archive = join(root, "output.rexp");
  extractRexp(fixture, workspace, password);
  packPlainDirectory(workspace, archive, password);

  assert.equal(lstatSync(workspace).mode & 0o777, 0o700);
  assert.equal(lstatSync(join(workspace, "policies")).mode & 0o777, 0o700);
  for (const name of ["metadata.json", "report.json", "metadata.hashes.json"]) {
    assert.equal(lstatSync(join(workspace, name)).mode & 0o777, 0o600, name);
  }
  for (const name of readdirSync(join(workspace, "policies"))) {
    assert.equal(lstatSync(join(workspace, "policies", name)).mode & 0o777, 0o600, name);
  }
  assert.equal(lstatSync(archive).mode & 0o777, 0o600);
});

test("extractRexp decrypts and formats every policy before replacing a forced workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-late-decrypt-failure-"));
  const output = join(root, "extracted");
  const malformed = join(root, "malformed.rexp");
  const priorMetadata = join(output, "metadata.json");
  const priorPolicy = join(output, "policies", "policy_PRIOR.json");
  const priorNote = join(output, "notes.txt");
  mkdirSync(join(output, "policies"), { recursive: true });
  writeFileSync(priorMetadata, '{"prior":true}\n');
  writeFileSync(priorPolicy, '{"uuid":"PRIOR"}\n');
  writeFileSync(priorNote, "keep me\n");

  const entries = readZip(readFileSync(fixture));
  const policy = entries.find((entry) => entry.name.startsWith("policies/policy_"));
  if (policy === undefined) throw new Error("Expected fixture policy entry");
  const brokenPayload = Buffer.from(policy.data);
  const lastByteIndex = brokenPayload.length - 1;
  brokenPayload[lastByteIndex] = (brokenPayload[lastByteIndex] ?? 0) ^ 0xff;
  const malformedEntries = entries.map((entry) => {
    if (entry.name === policy.name) return { name: entry.name, data: brokenPayload };
    if (entry.name !== "metadata.bin") return entry;
    const hashes = JSON.parse(decryptRelutionPayload(entry.data, password).toString("utf8")) as Record<string, string>;
    hashes[policy.name] = createHash("sha256").update(brokenPayload).digest("hex");
    return {
      name: entry.name,
      data: encryptRelutionPayload(Buffer.from(JSON.stringify(hashes), "utf8"), password, deterministicRandomBytes()),
    };
  });
  writeFileSync(malformed, writeZip(malformedEntries));

  assert.throws(() => extractRexp(malformed, output, password, { force: true, pretty: true }), /authenticate|Unsupported state|bad decrypt/i);
  assert.equal(readFileSync(priorMetadata, "utf8"), '{"prior":true}\n');
  assert.equal(readFileSync(priorPolicy, "utf8"), '{"uuid":"PRIOR"}\n');
  assert.equal(readFileSync(priorNote, "utf8"), "keep me\n");
});
