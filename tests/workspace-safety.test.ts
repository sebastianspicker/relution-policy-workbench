/** Protects workspace persistence from symlinks, partial writes, and unsafe paths. */
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, parse } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { loadTemplateBundle } from "../src/templates.js";
import {
  createNewWorkspace,
  loadWorkspace,
  MAX_WORKSPACE_JSON_BYTES,
  MAX_WORKSPACE_POLICY_FILES,
  MAX_WORKSPACE_TOTAL_JSON_BYTES,
  saveWorkspace,
} from "../src/workspace.js";

test("saveWorkspace preserves the previous workspace when serialization fails mid-save", () => {
  const bundle = loadTemplateBundle();
  const workspaceDir = mkdtempSync(join(tmpdir(), "relution-workspace-atomic-save-"));
  const original = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Atomic Save Test",
    serverVersion: bundle.serverVersion,
  });
  const invalidWorkspace = structuredClone(original);
  const report = invalidWorkspace.report as Record<string, unknown>;
  report.self = report;

  assert.throws(() => saveWorkspace(workspaceDir, invalidWorkspace), /circular|cyclic/i);
  assert.deepEqual(loadWorkspace(workspaceDir), original);
});

test("saveWorkspace rejects non-lossless JSON values before the prior workspace changes", () => {
  const { workspaceDir, workspace } = createWorkspace("Non-lossless JSON");
  const invalid = structuredClone(workspace);
  invalid.metadata.invalid = Number.NaN;
  assert.throws(() => saveWorkspace(workspaceDir, invalid), /finite JSON numbers/u);
  assert.deepEqual(loadWorkspace(workspaceDir), workspace);
});

test("saveWorkspace rejects custom JSON serialization hooks before the prior workspace changes", () => {
  const { workspaceDir, workspace } = createWorkspace("Custom JSON Hook");
  const invalid = structuredClone(workspace);
  invalid.metadata.toJSON = () => ({});
  assert.throws(() => saveWorkspace(workspaceDir, invalid), /custom toJSON/u);
  assert.deepEqual(loadWorkspace(workspaceDir), workspace);
});

test("createNewWorkspace validates input before it creates a workspace directory", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-workspace-create-validation-"));
  const workspaceDir = join(root, "workspace");
  assert.throws(() => createNewWorkspace({ workspace: workspaceDir, platform: "UNKNOWN", name: "", serverVersion: "" }), /Policy name/u);
  assert.equal(existsSync(workspaceDir), false);
});

test("createNewWorkspace rejects a blank or filesystem-root workspace target", () => {
  const bundle = loadTemplateBundle();
  assert.throws(() => createNewWorkspace({ workspace: "   ", platform: "IOS", name: "No target", serverVersion: bundle.serverVersion }), /Workspace path must not be empty/u);
  const filesystemRoot = parse(process.cwd()).root;
  assert.throws(() => createNewWorkspace({ workspace: filesystemRoot, platform: "IOS", name: "No root", serverVersion: bundle.serverVersion, force: true }), /must not be the filesystem root/u);
});

test("forced workspace creation refuses to replace a non-workspace directory", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-workspace-force-safety-"));
  writeFileSync(join(root, "keep.txt"), "keep");
  assert.throws(() => createNewWorkspace({ workspace: root, platform: "IOS", name: "Force", serverVersion: "1", force: true }), /non-workspace/u);
  assert.equal(readFileSync(join(root, "keep.txt"), "utf8"), "keep");
});

test("forced workspace creation refuses an extra file beside a managed workspace surface", () => {
  const { workspaceDir } = createWorkspace("Force Surface Safety");
  writeFileSync(join(workspaceDir, "keep.txt"), "keep");

  assert.throws(() => createNewWorkspace({ workspace: workspaceDir, platform: "IOS", name: "Force", serverVersion: "1", force: true }), /non-workspace/u);
  assert.equal(readFileSync(join(workspaceDir, "keep.txt"), "utf8"), "keep");
});

test("saveWorkspace rejects oversized serialized JSON before replacing the workspace", () => {
  const { workspaceDir, workspace } = createWorkspace("Oversized Serialized JSON");
  const oversized = structuredClone(workspace);
  oversized.metadata.payload = "x".repeat(MAX_WORKSPACE_JSON_BYTES);

  assert.throws(() => saveWorkspace(workspaceDir, oversized), /exceeds the .* byte limit/u);
  assert.deepEqual(loadWorkspace(workspaceDir), workspace);
});

test("saveWorkspace permits and round-trips a JSON payload at the byte limit", () => {
  const { workspaceDir, workspace } = createWorkspace("Boundary Serialized JSON");
  const boundary = structuredClone(workspace);
  const emptyPayloadBytes = Buffer.byteLength(`${JSON.stringify({ payload: "" }, null, 2)}\n`, "utf8");
  boundary.metadata = { payload: "x".repeat(MAX_WORKSPACE_JSON_BYTES - emptyPayloadBytes) };

  saveWorkspace(workspaceDir, boundary);
  assert.deepEqual(loadWorkspace(workspaceDir), boundary);
});

test("saveWorkspace rejects an aggregate payload over the byte limit before replacing the workspace", () => {
  const { workspaceDir, workspace } = createWorkspace("Aggregate Serialized JSON");
  const oversized = structuredClone(workspace);
  const emptyPayloadBytes = Buffer.byteLength(`${JSON.stringify({ payload: "" }, null, 2)}\n`, "utf8");
  const document = { payload: "x".repeat(MAX_WORKSPACE_JSON_BYTES - emptyPayloadBytes) };
  oversized.policies = Array.from({ length: 9 }, (_, index) => ({ path: `policies/policy_${String(index)}.json`, document }));

  assert.throws(() => saveWorkspace(workspaceDir, oversized), /aggregate limit/u);
  assert.deepEqual(loadWorkspace(workspaceDir), workspace);
});

test("saveWorkspace rejects too many policies before replacing the workspace", () => {
  const { workspaceDir, workspace } = createWorkspace("Policy Count Limit");
  const oversized = structuredClone(workspace);
  const document = oversized.policies[0]!.document;
  oversized.policies = Array.from({ length: MAX_WORKSPACE_POLICY_FILES + 1 }, (_, index) => ({
    path: `policies/policy_${String(index)}.json`,
    document,
  }));

  assert.throws(() => saveWorkspace(workspaceDir, oversized), /more than .* policy files/u);
  assert.deepEqual(loadWorkspace(workspaceDir), workspace);
});

test("loadWorkspace rejects symlinked managed files", () => {
  const bundle = loadTemplateBundle();
  const workspaceDir = mkdtempSync(join(tmpdir(), "relution-workspace-load-symlink-"));
  createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Load Symlink Test",
    serverVersion: bundle.serverVersion,
  });

  const outsidePath = join(workspaceDir, "..", "outside-report.json");
  writeFileSync(outsidePath, "{}\n");
  rmSync(join(workspaceDir, "report.json"));
  symlinkSync(outsidePath, join(workspaceDir, "report.json"));

  assert.throws(() => loadWorkspace(workspaceDir), /symlink/i);
});

test("loadWorkspace rejects malformed UTF-8 workspace JSON", () => {
  const { workspaceDir } = createWorkspace("Malformed UTF-8");
  writeFileSync(join(workspaceDir, "metadata.json"), Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xc3, 0x28, 0x7d]));
  assert.throws(() => loadWorkspace(workspaceDir), /Invalid UTF-8/u);
});

test("loadWorkspace rejects unexpected policy entries and save rejects case-colliding paths", () => {
  const { workspaceDir, workspace } = createWorkspace("Policy Entry Safety");
  writeFileSync(join(workspaceDir, "policies", "notes.txt"), "unexpected");
  assert.throws(() => loadWorkspace(workspaceDir), /unexpected entry/u);
  rmSync(join(workspaceDir, "policies", "notes.txt"));
  const colliding = structuredClone(workspace);
  const source = colliding.policies[0]!;
  colliding.policies.push({ path: source.path.toLowerCase(), document: source.document });
  assert.throws(() => saveWorkspace(workspaceDir, colliding), /collide/u);
});

test("loadWorkspace deterministically recovers a journaled interrupted backup phase", () => {
  const { workspaceDir, workspace } = createWorkspace("Journal Recovery");
  const durableWorkspaceDir = realpathSync.native(workspaceDir);
  const root = dirname(durableWorkspaceDir);
  const base = basename(durableWorkspaceDir);
  const backup = mkdtempSync(join(root, `${base}-backup-`));
  const stage = mkdtempSync(join(root, `${base}-stage-`));
  for (const entry of ["metadata.json", "report.json", "policies"]) renameSync(join(durableWorkspaceDir, entry), join(backup, entry));
  writeFileSync(join(root, `.${base}-workspace-transaction.json`), JSON.stringify({
    workspaceDir: durableWorkspaceDir,
    stageDir: stage,
    backupDir: backup,
    phase: "backed-up",
    movedToBackup: ["metadata.json", "report.json", "policies"],
    movedFromStage: [],
  }));
  assert.deepEqual(loadWorkspace(workspaceDir), workspace);
  assert.equal(existsSync(join(root, `.${base}-workspace-transaction.json`)), false);
});

test("loadWorkspace reports the policy path for truncated policy JSON", () => {
  const { workspaceDir, policyFile } = createWorkspaceWithPolicyFile("Truncated Policy JSON");
  writeFileSync(policyFile, "{\"uuid\":");

  assert.throws(() => loadWorkspace(workspaceDir), (error) => {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, /Failed to parse workspace JSON file/u);
    assert.equal(message.includes(policyFile), true);
    return true;
  });
});

test("loadWorkspace rejects empty policy JSON with the policy path", () => {
  const { workspaceDir, policyFile } = createWorkspaceWithPolicyFile("Empty Policy JSON");
  writeFileSync(policyFile, "");

  assert.throws(() => loadWorkspace(workspaceDir), (error) => {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, /Failed to parse workspace JSON file/u);
    assert.equal(message.includes(policyFile), true);
    return true;
  });
});

test("loadWorkspace rejects an oversized JSON file before reading it", () => {
  const { workspaceDir } = createWorkspaceWithPolicyFile("Oversized Workspace JSON");
  truncateSync(join(workspaceDir, "metadata.json"), MAX_WORKSPACE_JSON_BYTES + 1);

  assert.throws(() => loadWorkspace(workspaceDir), /Workspace JSON file exceeds the .* byte limit/u);
});

test("loadWorkspace rejects workspace JSON that exceeds its aggregate byte budget before parsing", () => {
  const { workspaceDir, policyFile } = createWorkspaceWithPolicyFile("Aggregate Workspace JSON");
  truncateSync(policyFile, MAX_WORKSPACE_JSON_BYTES);
  for (let index = 1; index < 9; index += 1) {
    const path = join(workspaceDir, "policies", `policy_aggregate_${String(index)}.json`);
    writeFileSync(path, "");
    truncateSync(path, MAX_WORKSPACE_JSON_BYTES);
  }

  assert.equal(MAX_WORKSPACE_JSON_BYTES * 9 > MAX_WORKSPACE_TOTAL_JSON_BYTES, true);
  assert.throws(() => loadWorkspace(workspaceDir), /aggregate limit/u);
});

test("loadWorkspace rejects more than the supported number of policy files", () => {
  const { workspaceDir, policyFile } = createWorkspaceWithPolicyFile("Policy File Count");
  const document = readFileSync(policyFile);
  for (let index = 0; index < MAX_WORKSPACE_POLICY_FILES; index += 1) {
    writeFileSync(join(workspaceDir, "policies", `policy_count_${String(index)}.json`), document);
  }

  assert.throws(() => loadWorkspace(workspaceDir), /more than .* policy files/u);
});

test("saveWorkspace rejects symlinked managed files that point outside the workspace", () => {
  const bundle = loadTemplateBundle();
  const workspaceDir = mkdtempSync(join(tmpdir(), "relution-workspace-save-symlink-"));
  const original = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Save Symlink Test",
    serverVersion: bundle.serverVersion,
  });

  const outsidePath = join(workspaceDir, "..", "outside-metadata.json");
  writeFileSync(outsidePath, "{\"outside\":true}\n");
  rmSync(join(workspaceDir, "metadata.json"));
  symlinkSync(outsidePath, join(workspaceDir, "metadata.json"));

  assert.throws(() => saveWorkspace(workspaceDir, original), /symlink/i);
  assert.equal(readFileSync(outsidePath, "utf8"), "{\"outside\":true}\n");
});

test("saveWorkspace rejects a symlinked workspace ancestor", () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-workspace-parent-symlink-"));
  const source = join(root, "source");
  const outside = join(root, "outside");
  const alias = join(root, "alias");
  mkdirSync(outside);
  const workspace = createNewWorkspace({
    workspace: source,
    platform: "IOS",
    name: "Ancestor Symlink Test",
    serverVersion: bundle.serverVersion,
  });
  symlinkSync(outside, alias);

  assert.throws(() => saveWorkspace(join(alias, "workspace"), workspace), /symlink/i);
  assert.equal(existsSync(join(outside, "workspace")), false);
});

test("saveWorkspace writes private managed files", { skip: process.platform === "win32" }, () => {
  const bundle = loadTemplateBundle();
  const workspaceDir = join(mkdtempSync(join(tmpdir(), "relution-workspace-private-")), "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Private Workspace Test",
    serverVersion: bundle.serverVersion,
  });

  assert.equal(lstatSync(workspaceDir).mode & 0o777, 0o700);
  assert.equal(lstatSync(join(workspaceDir, "metadata.json")).mode & 0o777, 0o600);
  assert.equal(lstatSync(join(workspaceDir, "report.json")).mode & 0o777, 0o600);
  assert.equal(lstatSync(join(workspaceDir, "policies")).mode & 0o777, 0o700);
  assert.equal(lstatSync(join(workspaceDir, workspace.policies[0]!.path)).mode & 0o777, 0o600);
});

function createWorkspaceWithPolicyFile(name: string): { workspaceDir: string; policyFile: string } {
  const { workspaceDir, workspace } = createWorkspace(name);
  return { workspaceDir, policyFile: join(workspaceDir, workspace.policies[0]!.path) };
}

function createWorkspace(name: string): { workspaceDir: string; workspace: ReturnType<typeof createNewWorkspace> } {
  const bundle = loadTemplateBundle();
  const workspaceDir = mkdtempSync(join(tmpdir(), "relution-workspace-corrupt-policy-"));
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name,
    serverVersion: bundle.serverVersion,
  });
  return { workspaceDir, workspace };
}
