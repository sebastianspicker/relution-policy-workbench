/** Covers the loopback editor's authenticated workspace boundary without a browser. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startEditorServer } from "../src/editor-server.js";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace } from "../src/workspace.js";

test("loopback editor rejects unauthenticated writes and validates without persisting", async () => {
  const root = mkdtempSync(join(tmpdir(), "rexp-editor-api-"));
  const workspace = join(root, "workspace");
  const out = join(root, "policy.rexp");
  createNewWorkspace({ workspace, platform: "IOS", name: "API boundary", serverVersion: loadTemplateBundle().serverVersion });
  const handle = await startEditorServer({ workspace, out, key: "rexp-editor-boundary-key", port: 0, host: "127.0.0.1" });
  try {
    const unauthenticated = await fetch(`${handle.url}api/workspace/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(unauthenticated.status, 403);

    const state = await fetch(`${handle.url}api/state`, { headers: { "x-rexp-studio-token": handle.apiToken } });
    assert.equal(state.ok, true);
    const payload = await state.json() as { workspace: { policies: Array<{ document: { platform: string } }> } };
    payload.workspace.policies[0]!.document.platform = "INVALID";
    const validation = await fetch(`${handle.url}api/workspace/validate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-rexp-studio-token": handle.apiToken },
      body: JSON.stringify({ workspace: payload.workspace }),
    });
    assert.equal(validation.ok, true);
    assert.equal((await validation.json() as { validation: { ok: boolean } }).validation.ok, false);
  } finally {
    await handle.close();
    rmSync(root, { recursive: true, force: true });
  }
});
