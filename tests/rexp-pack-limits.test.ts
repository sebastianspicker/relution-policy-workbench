/** Verifies pack-time size limits reject oversized workspaces before encryption. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { packPlainDirectory, verifyRexp } from "../src/rexp.js";
import { MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES } from "../src/zip.js";
import { deterministicRandomBytes, password } from "./rexp-helpers.js";

const REXP_ENCRYPTED_PAYLOAD_OVERHEAD_BYTES = 38;

test("pack rejects an encoded policy entry above the ZIP per-entry limit and preserves an existing output", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-pack-oversize-"));
  const input = createProject(root, MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES - REXP_ENCRYPTED_PAYLOAD_OVERHEAD_BYTES + 1);
  const output = join(root, "existing.rexp");
  const previousOutput = Buffer.from("preserve this archive output");
  let randomSourceCalls = 0;
  writeFileSync(output, previousOutput);

  assert.throws(
    () => packPlainDirectory(input, output, password, {
      force: true,
      randomBytes: (size) => {
        randomSourceCalls += 1;
        return deterministicRandomBytes()(size);
      },
    }),
    (error: unknown) => error instanceof Error
      && error.message === `REXP entry policies/policy_large.json exceeds the ZIP per-entry size limit (${MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES} bytes)`,
  );
  assert.equal(randomSourceCalls, 0, "size preflight must reject before encryption starts");
  assert.deepEqual(readFileSync(output), previousOutput);
});

test("pack accepts the largest encrypted policy entry that ZIP verification can read", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-rexp-pack-boundary-"));
  const input = createProject(root, MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES - REXP_ENCRYPTED_PAYLOAD_OVERHEAD_BYTES);
  const output = join(root, "boundary.rexp");

  packPlainDirectory(input, output, password, { randomBytes: deterministicRandomBytes() });

  assert.equal(existsSync(output), true);
  assert.equal(verifyRexp(output, password).ok, true);
});

function createProject(root: string, policyBytes: number): string {
  const input = join(root, "input");
  const policyDir = join(input, "policies");
  const prefix = '{"payload":"';
  const suffix = '"}';
  const payloadLength = policyBytes - Buffer.byteLength(prefix) - Buffer.byteLength(suffix);
  assert.ok(payloadLength >= 0);
  mkdirSync(policyDir, { recursive: true });
  writeFileSync(join(input, "metadata.json"), "{}");
  writeFileSync(join(input, "report.json"), "{}");
  writeFileSync(join(policyDir, "policy_large.json"), `${prefix}${"a".repeat(payloadLength)}${suffix}`);
  return input;
}
