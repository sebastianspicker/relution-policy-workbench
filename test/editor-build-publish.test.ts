import assert from "node:assert/strict";
import { lstatSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildVerifiedEditorArchive } from "../src/editor-build-publish.js";
import type { VerificationResult } from "../src/rexp.js";

const verified: VerificationResult = { ok: true, checkedEntries: [] };
const rejected: VerificationResult = { ok: false, checkedEntries: [] };

test("failed editor build verification preserves the prior archive and removes staging output", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-editor-build-publish-"));
  const output = join(root, "policy.rexp");
  writeFileSync(output, "previous archive");

  const result = buildVerifiedEditorArchive({
    workspace: root,
    output,
    key: "test-key",
    pack: (_workspace, temporary) => writeFileSync(temporary, "unverified archive", { mode: 0o600 }),
    verify: () => rejected,
  });

  assert.equal(result.ok, false);
  assert.equal(readFileSync(output, "utf8"), "previous archive");
  assert.deepEqual(readdirSync(root).sort(), ["policy.rexp"]);
});

test("failed editor pack preserves the prior archive and removes staging output", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-editor-build-publish-"));
  const output = join(root, "policy.rexp");
  writeFileSync(output, "previous archive");

  assert.throws(() => buildVerifiedEditorArchive({
    workspace: root,
    output,
    key: "test-key",
    pack: (_workspace, temporary) => {
      writeFileSync(temporary, "partial archive", { mode: 0o600 });
      throw new Error("pack failed");
    },
    verify: () => verified,
  }), /pack failed/u);
  assert.equal(readFileSync(output, "utf8"), "previous archive");
  assert.deepEqual(readdirSync(root).sort(), ["policy.rexp"]);
});

test("successful editor build replaces the prior archive atomically with private permissions", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-editor-build-publish-"));
  const output = join(root, "policy.rexp");
  writeFileSync(output, "previous archive");

  const result = buildVerifiedEditorArchive({
    workspace: root,
    output,
    key: "test-key",
    pack: (_workspace, temporary) => writeFileSync(temporary, "verified archive", { mode: 0o644 }),
    verify: () => verified,
  });

  assert.equal(result.ok, true);
  assert.equal(readFileSync(output, "utf8"), "verified archive");
  assert.equal(lstatSync(output).mode & 0o777, 0o600);
});

test("editor build rejects a symlink output before staging an archive", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-editor-build-publish-"));
  const outside = join(root, "outside.rexp");
  const output = join(root, "policy.rexp");
  writeFileSync(outside, "prior archive");
  symlinkSync(outside, output);

  assert.throws(() => buildVerifiedEditorArchive({
    workspace: root,
    output,
    key: "test-key",
    pack: () => assert.fail("pack must not run for a symlink output"),
    verify: () => verified,
  }), /Archive output path must not use symlinks/u);
  assert.equal(readFileSync(outside, "utf8"), "prior archive");
});
