/** Regression coverage for fail-closed REXP parsing and creation limits. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { decryptRelutionPayload, encryptRelutionPayload, extractRexp, inspectRexp, packPlainDirectory, verifyRexp } from "../src/rexp.js";
import { requireNewArchiveKey } from "../src/cli-runtime.js";
import { readZip, writeZip } from "../src/zip.js";
import { deterministicRandomBytes, fixture, password } from "./rexp-helpers.js";

test("rejects invalid UTF-8 JSON on every decrypted archive surface without replacing destinations", () => {
  for (const target of ["metadata.json", "report.json", "policy"] as const) {
    const archive = makeMalformedArchive(target);
    assert.throws(() => inspectRexp(archive, password), new RegExp(`Invalid UTF-8 JSON in ${target === "policy" ? "policies/" : target}`, "u"));
    assert.throws(() => verifyRexp(archive, password), new RegExp(`Invalid UTF-8 JSON in ${target === "policy" ? "policies/" : target}`, "u"));
    for (const pretty of [false, true]) assertDestinationPreserved(archive, pretty);
  }
});

test("pack rejects more than 1,021 policies before replacing an existing output", () => {
  const root = mkdtempSync(join(tmpdir(), "rexp-too-many-policies-"));
  const workspace = join(root, "workspace"); const policies = join(workspace, "policies"); const output = join(root, "output.rexp");
  mkdirSync(policies, { recursive: true });
  writeFileSync(join(workspace, "metadata.json"), "{}"); writeFileSync(join(workspace, "report.json"), "{}"); writeFileSync(output, "preserve");
  for (let index = 0; index < 1022; index += 1) writeFileSync(join(policies, `policy_${String(index)}.json`), "{}");
  assert.throws(() => packPlainDirectory(workspace, output, password, { force: true }), /at most 1021 policy entries/u);
  assert.equal(readFileSync(output, "utf8"), "preserve");
});

test("rejects archives with 1,025 entries on inspection, verification, and extraction", () => {
  const root = mkdtempSync(join(tmpdir(), "rexp-too-many-entries-"));
  const archive = join(root, "too-many.rexp"); const output = join(root, "output");
  writeFileSync(archive, writeZip(Array.from({ length: 1025 }, (_, index) => ({ name: `policies/policy_${String(index)}.json`, data: Buffer.from("{}") }))));
  assert.throws(() => inspectRexp(archive), /too many entries/u);
  assert.throws(() => verifyRexp(archive, password), /too many entries/u);
  assert.throws(() => extractRexp(archive, output, password), /too many entries/u);
  assert.equal(existsSync(output), false);
});

test("requires a strong key only on new-archive creation paths", () => {
  const weak = { command: "pack", positionals: [], options: { key: "key123" } };
  const strong = "archive-key-with-16-chars";
  assert.throws(() => requireNewArchiveKey(weak), /New archive passphrase must be at least 16 characters/u);
  assert.equal(requireNewArchiveKey({ command: "pack", positionals: [], options: { key: strong } }), strong);
  assert.doesNotThrow(() => verifyRexp(fixture, password), "legacy fixture key remains valid for reading");
});

function makeMalformedArchive(target: "metadata.json" | "report.json" | "policy"): string {
  const root = mkdtempSync(join(tmpdir(), `rexp-invalid-${target.replace(".", "-")}-`));
  const archive = join(root, "invalid.rexp"); const invalid = Buffer.from([0xff]); const entries = readZip(readFileSync(fixture));
  const policy = entries.find((entry) => entry.name.startsWith("policies/policy_"));
  if (policy === undefined) throw new Error("Fixture has no policy entry");
  const changedName = target === "policy" ? policy.name : target;
  const payload = target === "policy" ? encryptRelutionPayload(invalid, password, deterministicRandomBytes()) : invalid;
  const hashes = JSON.parse(decryptRelutionPayload(entries.find((entry) => entry.name === "metadata.bin")?.data ?? Buffer.alloc(0), password).toString("utf8")) as Record<string, string>;
  hashes[changedName] = createHash("sha256").update(payload).digest("hex");
  writeFileSync(archive, writeZip(entries.map((entry) => {
    if (entry.name === changedName) return { name: entry.name, data: payload };
    if (entry.name !== "metadata.bin") return entry;
    return { name: entry.name, data: encryptRelutionPayload(Buffer.from(JSON.stringify(hashes), "utf8"), password, deterministicRandomBytes()) };
  })));
  return archive;
}

function assertDestinationPreserved(archive: string, pretty: boolean): void {
  const output = join(mkdtempSync(join(tmpdir(), "rexp-invalid-destination-")), "workspace");
  mkdirSync(output); const marker = join(output, "marker.txt"); writeFileSync(marker, "unchanged");
  assert.throws(() => extractRexp(archive, output, password, { force: true, pretty }), /Invalid UTF-8 JSON/u);
  assert.equal(readFileSync(marker, "utf8"), "unchanged");
}
