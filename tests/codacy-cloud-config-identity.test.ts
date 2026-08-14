/** Characterizes fail-closed Codacy Cloud configuration identity checks. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { pathToFileURL } from "node:url";

const helperModule = pathToFileURL(resolve("tools/codacy-cloud-config.mjs")).href;
const expectedIdentity = {
  provider: "gh",
  organization: "sebastianspicker",
  repository: "rexp-studio",
};

function validate(configPath: string, required = false) {
  const script = [
    `import { validateCodacyConfigIdentity } from ${JSON.stringify(helperModule)};`,
    "process.exitCode = validateCodacyConfigIdentity(process.env.CODACY_CONFIG_PATH, JSON.parse(process.env.CODACY_EXPECTED_IDENTITY), { required: process.env.CODACY_REQUIRED === 'true' });",
  ].join("\n");
  return spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      CODACY_CONFIG_PATH: configPath,
      CODACY_EXPECTED_IDENTITY: JSON.stringify(expectedIdentity),
      CODACY_REQUIRED: String(required),
    },
  });
}

function withConfig(contents: string | undefined, assertion: (configPath: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "rexp-codacy-identity-"));
  const configPath = join(root, "config.json");
  try {
    if (contents !== undefined) {
      writeFileSync(configPath, contents);
    }
    assertion(configPath);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function config(metadata: Record<string, unknown>) {
  return JSON.stringify({ version: 1, metadata });
}

test("accepts matching Codacy config identity", () => {
  withConfig(config({ ...expectedIdentity, repositoryName: expectedIdentity.repository }), (configPath) => {
    const result = validate(configPath);
    assert.equal(result.status, 0, result.stderr);
  });
});

test("rejects a Codacy config for another repository", () => {
  const mismatchedRepository = ["relution", "policy", "workbench"].join("-");
  withConfig(config({ provider: "gh", organization: "sebastianspicker", repositoryName: mismatchedRepository }), (configPath) => {
    const result = validate(configPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /identity mismatch.*rexp-studio/u);
    assert.equal(result.stderr.includes(mismatchedRepository), true);
  });
});

test("rejects malformed Codacy config JSON", () => {
  withConfig("{", (configPath) => {
    const result = validate(configPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot validate Codacy config/u);
  });
});

test("rejects Codacy config without complete identity metadata", () => {
  withConfig(config({ provider: "gh", organization: "sebastianspicker" }), (configPath) => {
    const result = validate(configPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing provider, organization, or repository identity metadata/u);
  });
});

test("allows an absent pre-refresh Codacy config to bootstrap", () => {
  withConfig(undefined, (configPath) => {
    const result = validate(configPath);
    assert.equal(result.status, 0, result.stderr);
  });
});
