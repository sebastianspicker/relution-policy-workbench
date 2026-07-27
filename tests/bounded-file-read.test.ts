/** Protects capped regular-file reads from oversized and symlinked inputs. */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("bounded regular-file reads reject FIFOs without blocking", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "relution-bounded-fifo-"));
  const fifo = join(root, "input.fifo");
  try {
    execFileSync("mkfifo", [fifo]);
    const moduleUrl = new URL("../src/utils/bounded-file-read.js", import.meta.url).href;
    const script = [
      `const { readBoundedRegularFileNoFollow } = await import(${JSON.stringify(moduleUrl)});`,
      "try {",
      `  readBoundedRegularFileNoFollow(${JSON.stringify(fifo)}, { label: "FIFO input", maxBytes: 1024 });`,
      "  process.exitCode = 2;",
      "} catch (error) {",
      "  if (!(error instanceof Error) || !error.message.includes(\"must be a regular file\")) throw error;",
      "}",
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      encoding: "utf8",
      timeout: 1_000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
