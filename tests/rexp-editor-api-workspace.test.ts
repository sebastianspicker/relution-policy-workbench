/** Exercises editor workspace routes against persisted files and unsafe path cases. */
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { inspectRexp, verifyRexp } from "../src/rexp.js";
import { loadEditorSidecar, recordMobileConfigRestoreEntries } from "../src/sidecar.js";
import { loadAppleSchemaCatalog } from "../src/apple-schema-catalog.js";
import { loadTemplateBundle } from "../src/templates.js";
import {
  addAppleCompatConfigurationToWorkspace,
  addPolicyToWorkspace,
  createNewWorkspace,
  loadWorkspace,
  type PolicyWorkspace,
} from "../src/workspace.js";
import {
  configurationTypes,
  fixture,
  newArchivePassword,
  password,
  postJson,
  requirePolicyPath,
  startRegisteredTestEditor as startEditorServer,
  startTestEditor,
  type ReconcileResponse,
  type SidecarResponse,
  type WorkspaceValidateOnlyResponse,
  type WorkspaceValidationResponse,
} from "./rexp-helpers.js";
import { assertWorkspacePolicyMarker, clearFirstPolicyConfigurations, expandWorkspace, workspacePolicyMarker, workspaceWithPolicyMarker } from "./rexp-editor-workspace-test-helpers.js";


test("validates a posted workspace without saving it", async () => {
  const { workspaceDir, workspace, handle } = await startTestEditor({
    prefix: "relution-editor-validate-",
    platform: "IOS",
    name: "Validate Only Test",
  });

  try {
    const invalidWorkspace = structuredClone(workspace) as PolicyWorkspace;
    const firstPolicy = invalidWorkspace.policies[0];
    assert.notEqual(firstPolicy, undefined);
    if (firstPolicy !== undefined) {
      firstPolicy.document.platform = "NOT_A_PLATFORM";
    }

    const response = await postJson(`${handle.url}api/workspace/validate`, { workspace: invalidWorkspace });
    assert.equal(response.ok, true);
    const result = await response.json() as WorkspaceValidateOnlyResponse;
    assert.equal(result.validation.ok, false);
    assert.match(result.validation.errors[0]?.message ?? "", /platform is invalid/);
    assert.deepEqual(loadWorkspace(workspaceDir), workspace);
  } finally {
    await handle.close();
  }
});

test("validates generated workspaces larger than the default JSON body limit", async () => {
  const { workspaceDir, workspace, handle } = await startTestEditor({
    prefix: "relution-editor-large-validate-",
    platform: "IOS",
    name: "Large Validate Test",
  });

  try {
    const largeWorkspace = expandWorkspace(workspace, 500);
    assert.equal(JSON.stringify({ workspace: largeWorkspace }).length > 1024 * 1024, true);

    const response = await postJson(`${handle.url}api/workspace/validate`, { workspace: largeWorkspace });
    assert.equal(response.ok, true);
    const result = await response.json() as WorkspaceValidateOnlyResponse;
    assert.equal(result.validation.ok, true);
    assert.deepEqual(loadWorkspace(workspaceDir), workspace);
  } finally {
    await handle.close();
  }
});

test("replaces persisted policies when a workspace save removes one", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-save-replace-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Keep iOS",
    serverVersion: bundle.serverVersion,
  });
  addPolicyToWorkspace(workspaceDir, bundle, { platform: "WINDOWS", name: "Remove Windows" });
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: newArchivePassword,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const nextWorkspace = loadWorkspace(workspaceDir);
    nextWorkspace.policies = nextWorkspace.policies.slice(0, 1);

    const saveResponse = await postJson(`${handle.url}api/workspace`, { workspace: nextWorkspace });
    assert.equal(saveResponse.ok, true);
    const saveResult = await saveResponse.json() as WorkspaceValidationResponse;
    assert.equal(saveResult.workspace.policies.length, 1);
    assert.equal(loadWorkspace(workspaceDir).policies.length, 1);

    const buildResponse = await postJson(`${handle.url}api/build`, {});
    assert.equal(buildResponse.ok, true);
    assert.equal(inspectRexp(out, newArchivePassword).policyEntries.length, 1);
  } finally {
    await handle.close();
  }
});

test("concurrent workspace saves publish one complete workspace surface", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-concurrent-saves-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Concurrent Save Test",
    serverVersion: bundle.serverVersion,
  });
  const firstWorkspace = workspaceWithPolicyMarker(workspace, "first");
  const secondWorkspace = workspaceWithPolicyMarker(workspace, "second");
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const [firstResponse, secondResponse] = await Promise.all([
      postJson(`${handle.url}api/workspace`, { workspace: firstWorkspace }),
      postJson(`${handle.url}api/workspace`, { workspace: secondWorkspace }),
    ]);
    assert.equal(firstResponse.ok, true);
    assert.equal(secondResponse.ok, true);

    const firstResult = await firstResponse.json() as WorkspaceValidationResponse;
    const secondResult = await secondResponse.json() as WorkspaceValidationResponse;
    assertWorkspacePolicyMarker(firstResult.workspace, "first");
    assertWorkspacePolicyMarker(secondResult.workspace, "second");

    const finalMarker = workspacePolicyMarker(loadWorkspace(workspaceDir));
    assert.equal(finalMarker === "first" || finalMarker === "second", true, "final workspace should be one complete save");
  } finally {
    await handle.close();
  }
});

test("concurrent failed workspace save cannot roll back a successful save", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-concurrent-save-failure-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Concurrent Failure Test",
    serverVersion: bundle.serverVersion,
  });
  const validWorkspace = workspaceWithPolicyMarker(workspace, "valid");
  const invalidWorkspace = structuredClone(workspace) as PolicyWorkspace;
  invalidWorkspace.policies[0]!.path = "../outside.json";
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const [validResponse, invalidResponse] = await Promise.all([
      postJson(`${handle.url}api/workspace`, { workspace: validWorkspace }),
      postJson(`${handle.url}api/workspace`, { workspace: invalidWorkspace }),
    ]);
    assert.equal(validResponse.ok, true);
    assert.equal(invalidResponse.status, 400);
    assert.equal(existsSync(join(workspaceDir, "..", "outside.json")), false);
    assertWorkspacePolicyMarker(loadWorkspace(workspaceDir), "valid");
  } finally {
    await handle.close();
  }
});

test("rejects workspace save with policy paths outside the policies root", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-unsafe-save-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Unsafe Save Test",
    serverVersion: bundle.serverVersion,
  });
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const invalidWorkspace = structuredClone(workspace) as PolicyWorkspace;
    invalidWorkspace.policies[0]!.path = "../outside.json";
    const outsidePath = join(workspaceDir, "..", "outside.json");

    const response = await postJson(`${handle.url}api/workspace`, { workspace: invalidWorkspace });
    assert.equal(response.status, 400);
    assert.equal(existsSync(outsidePath), false);
    assert.deepEqual(loadWorkspace(workspaceDir), workspace);
  } finally {
    await handle.close();
  }
});

test("rejects workspace save with duplicate policy paths", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-duplicate-save-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Duplicate Save Test",
    serverVersion: bundle.serverVersion,
  });
  addPolicyToWorkspace(workspaceDir, bundle, { platform: "WINDOWS", name: "Duplicate Me" });
  const before = loadWorkspace(workspaceDir);
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const invalidWorkspace = structuredClone(before) as PolicyWorkspace;
    invalidWorkspace.policies[1]!.path = invalidWorkspace.policies[0]!.path;

    const response = await postJson(`${handle.url}api/workspace`, { workspace: invalidWorkspace });
    assert.equal(response.status, 400);
    assert.deepEqual(loadWorkspace(workspaceDir), before);
  } finally {
    await handle.close();
  }
});

test("rejects workspace save with structurally invalid metadata or policy documents", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-invalid-shape-save-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Invalid Shape Save Test",
    serverVersion: bundle.serverVersion,
  });
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const invalidMetadataWorkspace = structuredClone(workspace) as PolicyWorkspace;
    invalidMetadataWorkspace.metadata = [] as unknown as Record<string, unknown>;
    const metadataResponse = await postJson(`${handle.url}api/workspace`, { workspace: invalidMetadataWorkspace });
    assert.equal(metadataResponse.status, 400);
    assert.deepEqual(loadWorkspace(workspaceDir), workspace);

    const invalidPolicyWorkspace = structuredClone(workspace) as PolicyWorkspace;
    invalidPolicyWorkspace.policies[0]!.document = [] as unknown as Record<string, unknown>;
    const policyResponse = await postJson(`${handle.url}api/workspace`, { workspace: invalidPolicyWorkspace });
    assert.equal(policyResponse.status, 400);
    assert.deepEqual(loadWorkspace(workspaceDir), workspace);
  } finally {
    await handle.close();
  }
});

test("workspace save refreshes mobileconfig restore state from the saved workspace", async () => {
  const { handle, workspaceDir } = await startMobileconfigWorkspace("relution-editor-save-sidecar-refresh-", "Save Sidecar Refresh Test");

  try {
    const updatedWorkspace = loadWorkspace(workspaceDir);
    clearFirstPolicyConfigurations(updatedWorkspace);

    const saveResponse = await postJson(`${handle.url}api/workspace`, { workspace: updatedWorkspace });
    assert.equal(saveResponse.ok, true);
    const saveResult = await saveResponse.json() as WorkspaceValidationResponse & SidecarResponse;
    assert.deepEqual(saveResult.sidecar.mobileConfigRestore, []);
    assert.deepEqual(loadEditorSidecar(workspaceDir).mobileConfigRestore, []);

    const reconcileResponse = await postJson(`${handle.url}api/roundtrip/reconcile`, {});
    assert.equal(reconcileResponse.ok, true);
    const reconcileResult = await reconcileResponse.json() as ReconcileResponse;
    assert.equal(configurationTypes(reconcileResult.workspace).filter((type) => type === "APPLE_MOBILECONFIG").length, 0);
  } finally {
    await handle.close();
  }
});

test("concurrent workspace save and sidecar reconcile leave sidecar matching the saved workspace", async () => {
  const { handle, workspaceDir } = await startMobileconfigWorkspace("relution-editor-concurrent-save-reconcile-", "Concurrent Save Reconcile Test");
  try {
    const workspaceWithoutMobileconfig = loadWorkspace(workspaceDir);
    clearFirstPolicyConfigurations(workspaceWithoutMobileconfig);

    const [saveResponse, reconcileResponse] = await Promise.all([
      postJson(`${handle.url}api/workspace`, { workspace: workspaceWithoutMobileconfig }),
      postJson(`${handle.url}api/roundtrip/reconcile`, {}),
    ]);
    assert.equal(saveResponse.ok, true);
    assert.equal(reconcileResponse.ok, true);

    const persisted = loadWorkspace(workspaceDir);
    assert.equal(configurationTypes(persisted).filter((type) => type === "APPLE_MOBILECONFIG").length, 0);
    assert.deepEqual(loadEditorSidecar(workspaceDir).mobileConfigRestore, []);
  } finally {
    await handle.close();
  }
});

async function startMobileconfigWorkspace(prefix: string, name: string) {
  const bundle = loadTemplateBundle();
  const catalog = loadAppleSchemaCatalog();
  const root = mkdtempSync(join(tmpdir(), prefix));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name,
    serverVersion: bundle.serverVersion,
  });
  const policyPath = requirePolicyPath(workspace);
  addAppleCompatConfigurationToWorkspace(workspaceDir, { policyPath, versionIndex: 0, settingId: "associated-domains" });
  recordMobileConfigRestoreEntries(workspaceDir, loadWorkspace(workspaceDir), catalog.source.revision);
  const handle = await startEditorServer({ workspace: workspaceDir, out, key: password, port: 0, host: "127.0.0.1" });
  return { handle, workspaceDir };
}

test("restores the previous workspace when workspace save sidecar refresh fails", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-save-sidecar-rollback-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Save Rollback Test",
    serverVersion: bundle.serverVersion,
  });
  const before = loadWorkspace(workspaceDir);
  mkdirSync(join(workspaceDir, "editor-sidecar.json"));
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const nextWorkspace = structuredClone(workspace);
    nextWorkspace.policies[0]!.document.name = "Mutated Name";

    const saveResponse = await postJson(`${handle.url}api/workspace`, { workspace: nextWorkspace });
    assert.equal(saveResponse.status, 500);
    assert.match(await saveResponse.text(), /Internal editor error/u);
    assert.deepEqual(loadWorkspace(workspaceDir), before);
    assert.equal(lstatSync(join(workspaceDir, "editor-sidecar.json")).isDirectory(), true);
  } finally {
    await handle.close();
  }
});

test("workspace save rejects a symlinked sidecar without mutating the workspace or link", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-save-sidecar-symlink-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  const sidecarTarget = join(root, "outside-sidecar.json");
  const workspace = createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Save Symlink Rollback Test",
    serverVersion: bundle.serverVersion,
  });
  const before = loadWorkspace(workspaceDir);
  writeFileSync(sidecarTarget, "{}\n");
  symlinkSync(sidecarTarget, join(workspaceDir, "editor-sidecar.json"));
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: password,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const nextWorkspace = structuredClone(workspace);
    nextWorkspace.policies[0]!.document.name = "Mutated Symlink Name";

    const saveResponse = await postJson(`${handle.url}api/workspace`, { workspace: nextWorkspace });
    assert.equal(saveResponse.status, 500);
    assert.match(await saveResponse.text(), /Internal editor error/u);
    assert.deepEqual(loadWorkspace(workspaceDir), before);
    assert.equal(lstatSync(join(workspaceDir, "editor-sidecar.json")).isSymbolicLink(), true);
    assert.equal(readlinkSync(join(workspaceDir, "editor-sidecar.json")), sidecarTarget);
  } finally {
    await handle.close();
  }
});

test("import requires an explicit strong creation key before building a new archive", async () => {
  const bundle = loadTemplateBundle();
  const root = mkdtempSync(join(tmpdir(), "relution-editor-concurrent-import-build-"));
  const out = join(root, "policy.rexp");
  const workspaceDir = join(root, "workspace");
  createNewWorkspace({
    workspace: workspaceDir,
    platform: "IOS",
    name: "Concurrent Import Build Test",
    serverVersion: bundle.serverVersion,
  });
  const handle = await startEditorServer({
    workspace: workspaceDir,
    out,
    key: newArchivePassword,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const importResponse = await postJson(`${handle.url}api/import`, { dataBase64: readFileSync(fixture).toString("base64"), key: password });
    assert.equal(importResponse.ok, true);
    const keyResponse = await postJson(`${handle.url}api/key`, { key: newArchivePassword });
    assert.equal(keyResponse.ok, true);
    const buildResponse = await postJson(`${handle.url}api/build`, {});
    assert.equal(buildResponse.ok, true);

    const importResult = await importResponse.json() as WorkspaceValidationResponse & { keySet: boolean };
    const buildResult = await buildResponse.json() as {
      validation: WorkspaceValidationResponse["validation"];
      verification: { ok: boolean };
    };
    assert.equal(importResult.validation.ok, true);
    assert.equal(importResult.keySet, true);
    assert.equal(buildResult.validation.ok, true);
    assert.equal(buildResult.verification.ok, true);
    assert.equal(verifyRexp(out, newArchivePassword).ok, true);
    assert.equal(loadWorkspace(workspaceDir).policies.length > 0, true);
  } finally {
    await handle.close();
  }
});
