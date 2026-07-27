/** Reproduces CLI regressions around workspace setup, output paths, and errors. */
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("root help aliases print usage", () => {
  for (const command of ["help", "--help", "-h"]) {
    const result = spawnSync(process.execPath, [CLI_PATH, command], { encoding: "utf8" });

    assert.equal(result.status, 0, `${command}\n${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, /Usage:/u);
  }
});

test("serve rejects junk-suffixed numeric flags", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-cli-strict-int-"));
  const workspace = join(root, "workspace");
  const out = join(root, "out.rexp");
  const result = spawnSync(
    process.execPath,
    [CLI_PATH, "serve", "--workspace", workspace, "--out", out, "--port", "0junk", "--once"],
    { encoding: "utf8" },
  );

  assert.notEqual(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /ERROR: Expected integer for --port/u);
});

test("serve rejects non-loopback hosts and the retired network editor flag", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-cli-host-guard-"));
  const workspace = join(root, "workspace");
  const out = join(root, "out.rexp");
  const rejected = spawnSync(
    process.execPath,
    [CLI_PATH, "serve", "--workspace", workspace, "--out", out, "--host", "0.0.0.0", "--port", "0", "--once"],
    { encoding: "utf8" },
  );

  assert.notEqual(rejected.status, 0, `${rejected.stderr}\n${rejected.stdout}`);
  assert.match(rejected.stderr, /loopback/u);

  const stillRejected = spawnSync(
    process.execPath,
    [CLI_PATH, "serve", "--workspace", workspace, "--out", out, "--host", "0.0.0.0", "--port", "0", "--allow-network-editor", "--once"],
    { encoding: "utf8" },
  );

  assert.notEqual(stillRejected.status, 0, `${stillRejected.stderr}\n${stillRejected.stdout}`);
  assert.match(stillRejected.stderr, /--allow-network-editor was removed; the editor is loopback-only/u);
});

test("new --force resets stale editor sidecar state", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-cli-new-sidecar-"));
  const workspace = join(root, "workspace");
  const first = spawnSync(
    process.execPath,
    [CLI_PATH, "new", "--workspace", workspace, "--platform", "IOS", "--name", "Before", "--force"],
    { encoding: "utf8" },
  );
  assert.equal(first.status, 0, `${first.stderr}\n${first.stdout}`);

  writeFileSync(
    join(workspace, "editor-sidecar.json"),
    JSON.stringify({
      version: 1,
      mobileConfigRestore: [
        {
          policyPath: "policies/policy_stale.json",
          policyName: "Stale",
          platform: "IOS",
          configurationUuid: "stale",
          payloadType: "com.apple.stale",
          displayName: "Stale",
          signatureState: "unsigned",
          configuration: { uuid: "stale" },
        },
      ],
      ddmArtifacts: [{ uuid: "stale-ddm", schemaId: "ddm", payload: {} }],
      mdmCommandArtifacts: [],
      customManifests: [],
    }),
  );

  const second = spawnSync(
    process.execPath,
    [CLI_PATH, "new", "--workspace", workspace, "--platform", "IOS", "--name", "After", "--force"],
    { encoding: "utf8" },
  );
  assert.equal(second.status, 0, `${second.stderr}\n${second.stdout}`);
  assert.equal(existsSync(join(workspace, "editor-sidecar.json")), false);
});

test("new --force rejects a platform absent from the loaded template bundle", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-cli-new-platform-"));
  const workspace = join(root, "workspace");
  const result = spawnSync(
    process.execPath,
    [CLI_PATH, "new", "--workspace", workspace, "--platform", "UNSUPPORTED", "--name", "Nope", "--force"],
    { encoding: "utf8" },
  );

  assert.notEqual(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /Unsupported policy platform: UNSUPPORTED/u);
  assert.equal(existsSync(workspace), false);
});

test("RELUTION_REXP_KEY rejects obvious weak defaults", () => {
  const result = spawnSync(
    process.execPath,
    [CLI_PATH, "verify", "missing.rexp"],
    {
      encoding: "utf8",
      env: { ...process.env, RELUTION_REXP_KEY: "key123" },
    },
  );

  assert.notEqual(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /RELUTION_REXP_KEY must be at least 16 characters/u);
});
