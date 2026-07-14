import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace, loadWorkspace, saveWorkspace } from "../src/workspace.js";

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
  const bundle = loadTemplateBundle();
  const workspaceDir = mkdtempSync(join(tmpdir(), "relution-workspace-corrupt-policy-"));
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name,
    serverVersion: bundle.serverVersion,
  });
  return { workspaceDir, policyFile: join(workspaceDir, workspace.policies[0]!.path) };
}
