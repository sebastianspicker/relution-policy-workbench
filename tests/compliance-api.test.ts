/** Checks public compliance API evaluation and application response contracts. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startEditorServer } from "../src/editor-server.js";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace, loadWorkspace, type PolicyWorkspace } from "../src/workspace.js";
import { editorApiHeaders } from "./rexp-helpers.js";

for (const scenario of [
  {
    name: "compliance APIs report and apply an exact native BSI recommendation",
    prefix: "relution-compliance-native-", platform: "ANDROID_ENTERPRISE", workspaceName: "Compliance Native", source: "bsi",
    recommendationId: "android-enterprise-sys-3-2-4-a2", remediationId: "native-bundle:bsi-android-enterprise-android-enterprise-advanced-security-overrides",
    matches: (details: Record<string, unknown>) => details.type === "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES" && details.developerSettings === "DEVELOPER_SETTINGS_DISABLED",
  },
  {
    name: "compliance APIs report and apply an exact Apple schema CIS recommendation",
    prefix: "relution-compliance-apple-", platform: "IOS", workspaceName: "Compliance Apple", source: "cis",
    recommendationId: "cis-apple-ios-17-ipados-17-intune-1-0-0-2-2-2", remediationId: "recommendation:cis:cis-apple-ios-17-ipados-17-intune-1-0-0-2-2-2",
    matches: (details: Record<string, unknown>) => details.type === "APPLE_MOBILECONFIG" && details.secondLevelPayloadType === "com.apple.applicationaccess",
  },
] as const) {
  test(scenario.name, async () => {
    const { handle, workspace } = await startComplianceWorkspace(scenario);
    try {
      const check = await postCompliance(handle, "check", { workspace, selection: { policyIndex: 0, versionIndex: 0 }, sources: [scenario.source] });
      assert.equal(check.status, 200);
      const report = await check.json() as { report: { results: Array<{ source: string; recommendationId: string; status: string; remediationOptions: Array<{ id: string }> }> } };
      const exactGap = report.report.results.find((entry) => entry.recommendationId === scenario.recommendationId);
      assert.ok(exactGap);
      assert.equal(exactGap.source, scenario.source);
      assert.equal(exactGap.status, "exact-gap");
      assert.deepEqual(exactGap.remediationOptions.map((entry) => entry.id), [scenario.remediationId]);
      const apply = await postCompliance(handle, "apply", { workspace, selection: { policyIndex: 0, versionIndex: 0 }, sources: [scenario.source], source: scenario.source, recommendationId: scenario.recommendationId, remediationId: scenario.remediationId });
      assert.equal(apply.status, 200);
      const applied = await apply.json() as { workspace: PolicyWorkspace; report: { results: Array<{ recommendationId: string; status: string }> } };
      assert.equal(selectedConfigurations(applied.workspace).some((entry) => scenario.matches(entry.details ?? {})), true);
      assert.equal(applied.report.results.some((entry) => entry.recommendationId === scenario.recommendationId && entry.status === "compliant"), true);
    } finally { await handle.close(); }
  });
}

async function startComplianceWorkspace(options: { prefix: string; platform: string; workspaceName: string }) {
  const root = mkdtempSync(join(tmpdir(), options.prefix));
  const workspacePath = join(root, "workspace");
  const bundle = loadTemplateBundle();
  const workspace = createNewWorkspace({ workspace: workspacePath, platform: options.platform, name: options.workspaceName, serverVersion: bundle.serverVersion });
  const handle = await startEditorServer({ workspace: workspacePath, key: "", out: join(root, "output.rexp"), host: "127.0.0.1", port: 0 });
  return { handle, workspace, workspacePath };
}

async function postCompliance(handle: Awaited<ReturnType<typeof startEditorServer>>, action: "check" | "apply", body: unknown): Promise<Response> {
  return fetch(new URL(`api/compliance/${action}`, handle.url), { method: "POST", headers: { "content-type": "application/json", ...editorApiHeaders(handle) }, body: JSON.stringify(body) });
}
test("compliance apply rejects malformed selected configurations without persisting them", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-compliance-invalid-target-"));
  const workspacePath = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  const workspace = createNewWorkspace({
    workspace: workspacePath,
    platform: "ANDROID_ENTERPRISE",
    name: "Compliance Invalid Target",
    serverVersion: bundle.serverVersion,
  });
  const malformedWorkspace = structuredClone(workspace) as PolicyWorkspace;
  const configurations = selectedConfigurations(malformedWorkspace) as unknown[];
  configurations.push("not-a-configuration");

  const handle = await startEditorServer({
    workspace: workspacePath,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const applyResponse = await fetch(new URL("api/compliance/apply", handle.url), {
      method: "POST",
      headers: { "content-type": "application/json", ...editorApiHeaders(handle) },
      body: JSON.stringify({
        workspace: malformedWorkspace,
        selection: { policyIndex: 0, versionIndex: 0 },
        sources: ["bsi"],
        source: "bsi",
        recommendationId: "android-enterprise-sys-3-2-4-a2",
        remediationId: "native-bundle:bsi-android-enterprise-android-enterprise-advanced-security-overrides",
      }),
    });
    assert.equal(applyResponse.status, 400);
    const errorBody = await applyResponse.json() as { error?: string };
    assert.match(String(errorBody.error), /Selected policy version configuration is invalid/u);
    assert.deepEqual(loadWorkspace(workspacePath), workspace);
  } finally {
    await handle.close();
  }
});

function selectedConfigurations(workspace: PolicyWorkspace): Array<{ details?: Record<string, unknown> }> {
  const policy = workspace.policies[0];
  const document = policy?.document as { versions?: Array<{ configurations?: Array<{ details?: Record<string, unknown> }> }> } | undefined;
  const version = document?.versions?.[0];
  return Array.isArray(version?.configurations) ? version.configurations : [];
}
