import assert from "node:assert/strict";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { outputFileName, readOutputFileNoFollow, resolveStaticAssetPath } from "../src/editor-static-assets.js";

test("static asset resolution rejects file and parent symlinks outside the static root", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-static-root-"));
  const outside = mkdtempSync(join(tmpdir(), "relution-static-outside-"));
  const index = join(root, "index.html");
  writeFileSync(index, "safe index");
  writeFileSync(join(outside, "leak.html"), "outside secret");
  symlinkSync(join(outside, "leak.html"), join(root, "leak.html"));
  symlinkSync(outside, join(root, "linked"));

  assert.equal(resolveStaticAssetPath(root, "/leak.html"), index);
  assert.equal(resolveStaticAssetPath(root, "/linked/leak.html"), index);
});

test("editor output reads reject symlinks and sanitize download names", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-output-safe-"));
  const output = join(root, "safe.rexp");
  const linkedOutput = join(root, "linked.rexp");
  writeFileSync(output, "archive");
  symlinkSync(output, linkedOutput);

  assert.equal(readOutputFileNoFollow(output).toString("utf8"), "archive");
  assert.throws(() => readOutputFileNoFollow(linkedOutput), /symlink/u);
  assert.equal(outputFileName("/tmp/policy.rexp"), "policy.rexp");
  assert.equal(outputFileName('/tmp/policy"\r\nX-Evil.rexp'), "policy___X-Evil.rexp");
  assert.equal(outputFileName("/tmp/.."), "output.rexp");
});
