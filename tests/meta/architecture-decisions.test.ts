/** Validates the active safety-boundary decision records and their evidence links. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const DECISION_DIRECTORY = "docs/decisions";
const EXPECTED_RECORDS = {
  "0001-loopback-editor-authority.md": [
    "src/editor-server-runtime.ts",
    "src/editor-api-request-guards.ts",
    "tests/editor-runtime-regressions.test.ts",
  ],
  "0002-outbound-service-transport.md": [
    "src/http-service-transport.ts",
    "src/outbound-host-policy.ts",
    "tests/http-service-transport.test.ts",
  ],
  "0003-archive-and-sidecar-persistence.md": [
    "src/rexp-extraction.ts",
    "src/utils/atomic-private-file.ts",
    "tests/rexp-extraction-atomicity.test.ts",
  ],
  "0004-external-write-boundary.md": [
    "src/relution-transport.ts",
    "src/zammad-ticket-operations.ts",
    "tests/zammad-operation-hardening.test.ts",
  ],
} as const;

const REQUIRED_HEADINGS = [
  "## Context",
  "## Decision",
  "## Invariants",
  "## Ownership and source of truth",
  "## Compatibility",
  "## Rollback and recovery",
  "## Verification",
] as const;

test("exactly four active safety-boundary decisions link to live evidence", () => {
  const records = readdirSync(DECISION_DIRECTORY)
    .filter((path) => /^\d{4}-.*\.md$/u.test(path))
    .sort();
  assert.deepEqual(records, Object.keys(EXPECTED_RECORDS).sort());

  for (const record of records) {
    const content = readFileSync(`${DECISION_DIRECTORY}/${record}`, "utf8");
    assert.match(content, /^Status: Active\s*$/mu, `${record} status`);
    for (const heading of REQUIRED_HEADINGS) {
      assert.equal(content.includes(heading), true, `${record} must contain ${heading}`);
    }
    for (const evidencePath of EXPECTED_RECORDS[record as keyof typeof EXPECTED_RECORDS]) {
      assert.equal(existsSync(evidencePath), true, `${record} references missing ${evidencePath}`);
      assert.equal(content.includes(`\`${evidencePath}\``), true, `${record} must link ${evidencePath}`);
    }
  }
});
