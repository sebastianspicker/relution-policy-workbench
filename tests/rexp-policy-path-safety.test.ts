/** Defends encrypted policy extraction from traversal and portable-path collisions. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { extractRexp, inspectRexp, packPlainDirectory } from "../src/rexp.js";
import { saveWorkspace } from "../src/workspace.js";
import { readZip, writeZip } from "../src/zip.js";
import { deterministicRandomBytes, fixture, password } from "./rexp-helpers.js";

test("rejects non-portable and case-colliding policy archive paths", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-portable-policy-paths-"));
  const extracted = join(root, "extracted");
  const rebuilt = join(root, "roundtrip.rexp");
  extractRexp(fixture, extracted, password);
  packPlainDirectory(extracted, rebuilt, password, { randomBytes: deterministicRandomBytes() });
  const entries = readZip(readFileSync(rebuilt));
  const policy = entries.find((entry) => entry.name.startsWith("policies/policy_"));
  if (policy === undefined) throw new Error("Expected a rebuilt policy entry");

  const backslashArchive = join(root, "backslash.rexp");
  writeFileSync(backslashArchive, writeZip([...entries, { name: "policies/policy_bad\\..\\metadata.json", data: policy.data }]));
  assert.throws(() => inspectRexp(backslashArchive), /unsafe path separator/u);

  const collisionArchive = join(root, "collision.rexp");
  writeFileSync(collisionArchive, writeZip([
    ...entries,
    { name: "policies/policy_Case.json", data: policy.data },
    { name: "policies/policy_case.json", data: policy.data },
  ]));
  assert.throws(() => inspectRexp(collisionArchive), /Duplicate or colliding managed archive entry/u);
});

test("saveWorkspace rejects case-colliding portable policy paths", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-workspace-policy-collision-"));
  const workspace = {
    metadata: {},
    report: {},
    policies: [
      { path: "policies/policy_Case.json", document: {} },
      { path: "policies/policy_case.json", document: {} },
    ],
  };

  assert.throws(() => saveWorkspace(root, workspace), /duplicated or collides/u);
});
