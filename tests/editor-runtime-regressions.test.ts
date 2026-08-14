/** Collects regressions across editor runtime routing, state, and error boundaries. */
import assert from "node:assert/strict";
import test from "node:test";
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertAuthorizedEditorApiRequest } from "../src/editor-api-request-guards.js";
import { assertSafeEditorHost, editorUrlWithNetworkToken } from "../src/editor-loopback-host.js";
import { startEditorServer } from "../src/editor-server.js";
import { loadEditorSidecar, MAX_EDITOR_SIDECAR_JSON_BYTES, saveEditorSidecar, type EditorSidecarState } from "../src/sidecar.js";
import { loadTemplateBundle } from "../src/templates.js";
import { createNewWorkspace } from "../src/workspace.js";
import { getWithHost, objectWithProperties, postJson, postJsonWithHost, postRawWithHost } from "./editor-runtime-test-helpers.js";

const EMPTY_SIDECAR: EditorSidecarState = {
  version: 1,
  mobileConfigRestore: [],
  ddmArtifacts: [],
  mdmCommandArtifacts: [],
  customManifests: [],
};

test("editor API authorization checks the capability before Host policy details", () => {
  const options = { workspace: "/tmp/workspace", key: "", out: "/tmp/output.rexp" };
  const unauthenticated = { headers: { host: "attacker.example.test" } } as never;
  assert.throws(
    () => assertAuthorizedEditorApiRequest(unauthenticated, options, "expected-token"),
    /require the editor token/u,
  );

  const authenticated = {
    headers: { host: "attacker.example.test", "x-rexp-studio-token": "expected-token" },
  } as never;
  assert.throws(
    () => assertAuthorizedEditorApiRequest(authenticated, options, "expected-token"),
    /loopback Host header/u,
  );
});

async function withEditorServer<T>(
  options: Parameters<typeof startEditorServer>[0],
  callback: (handle: Awaited<ReturnType<typeof startEditorServer>>) => Promise<T>,
): Promise<T> {
  const handle = await startEditorServer(options);
  try {
    return await callback(handle);
  } finally {
    await handle.close();
  }
}

test("sidecar I/O rejects a symlinked editor-sidecar.json", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-sidecar-"));
  const workspace = join(root, "workspace");
  const outside = join(root, "outside-sidecar.json");
  mkdirSync(workspace, { recursive: true });
  writeFileSync(outside, `${JSON.stringify(EMPTY_SIDECAR)}\n`);
  symlinkSync(outside, join(workspace, "editor-sidecar.json"));

  assert.equal(lstatSync(join(workspace, "editor-sidecar.json")).isSymbolicLink(), true);
  assert.throws(() => loadEditorSidecar(workspace), /sidecar path must not use symlinks/u);
  assert.throws(() => saveEditorSidecar(workspace, EMPTY_SIDECAR), /sidecar path must not use symlinks/u);
});

test("sidecar I/O rejects a symlinked workspace root", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-sidecar-root-"));
  const realWorkspace = join(root, "real-workspace");
  const workspaceLink = join(root, "workspace-link");
  mkdirSync(realWorkspace, { recursive: true });
  symlinkSync(realWorkspace, workspaceLink);

  assert.equal(lstatSync(workspaceLink).isSymbolicLink(), true);
  assert.throws(() => loadEditorSidecar(workspaceLink), /sidecar path must not use symlinks/u);
  assert.throws(() => saveEditorSidecar(workspaceLink, EMPTY_SIDECAR), /sidecar path must not use symlinks/u);
});

test("sidecar I/O rejects malformed persisted sidecar state", () => {
  const scenarios: Array<{ name: string; sidecar: unknown; expected: RegExp }> = [
    {
      name: "wrong-version",
      sidecar: { version: 0, mobileConfigRestore: [], ddmArtifacts: [], mdmCommandArtifacts: [], customManifests: [] },
      expected: /expected version 1 sidecar object/u,
    },
    {
      name: "missing-array",
      sidecar: { version: 1, mobileConfigRestore: [], ddmArtifacts: [], mdmCommandArtifacts: [] },
      expected: /expected customManifests array/u,
    },
    {
      name: "invalid-artifact",
      sidecar: { version: 1, mobileConfigRestore: [], ddmArtifacts: [{ uuid: 42 }], mdmCommandArtifacts: [], customManifests: [] },
      expected: /invalid ddmArtifacts\[0\]/u,
    },
  ];

  for (const scenario of scenarios) {
    const root = mkdtempSync(join(tmpdir(), `relution-sidecar-malformed-${scenario.name}-`));
    const workspace = join(root, "workspace");
    mkdirSync(workspace, { recursive: true });
    writeFileSync(join(workspace, "editor-sidecar.json"), `${JSON.stringify(scenario.sidecar, null, 2)}\n`);

    assert.throws(() => loadEditorSidecar(workspace), scenario.expected, scenario.name);
  }
});

test("sidecar I/O rejects an oversized sidecar before reading it", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-sidecar-oversized-"));
  const workspace = join(root, "workspace");
  mkdirSync(workspace, { recursive: true });
  const sidecarPath = join(workspace, "editor-sidecar.json");
  writeFileSync(sidecarPath, "");
  truncateSync(sidecarPath, MAX_EDITOR_SIDECAR_JSON_BYTES + 1);

  assert.throws(() => loadEditorSidecar(workspace), /Editor sidecar JSON file exceeds the .* byte limit/u);
});

test("GET state surfaces malformed sidecar state without overwriting it", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-sidecar-state-malformed-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Malformed sidecar state",
    serverVersion: bundle.serverVersion,
  });
  const sidecarPath = join(workspace, "editor-sidecar.json");
  const malformedSidecar = `${JSON.stringify({
    version: 1,
    mobileConfigRestore: [{ policyPath: "policies/policy_TEST.json", configuration: {}, configurationUuid: 42 }],
    ddmArtifacts: [],
    mdmCommandArtifacts: [],
    customManifests: [],
  }, null, 2)}\n`;
  writeFileSync(sidecarPath, malformedSidecar);

  await withEditorServer({ workspace, key: "", out, host: "127.0.0.1", port: 0 }, async (handle) => {
    const response = await fetch(new URL("api/state", handle.url), { headers: { "x-rexp-studio-token": handle.apiToken } });
    assert.equal(response.status, 500);
    assert.match(await response.text(), /Internal editor error/u);
  });

  assert.equal(readFileSync(sidecarPath, "utf8"), malformedSidecar);
});

test("editor mutation endpoints return 400 for malformed client requests", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-editor-api-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  const initialWorkspace = createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "API validation",
    serverVersion: bundle.serverVersion,
  });

  const handle = await startEditorServer({
    workspace,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const policyPath = initialWorkspace.policies[0]!.path;
    const knownType = bundle.configurationTypes[0]!.type;
    const domainFailures = [
      {
        path: "api/add-configuration",
        body: { policyPath, versionIndex: 0, type: "UNKNOWN_CONFIGURATION_TYPE" },
        expected: /Unknown configuration type/u,
      },
      {
        path: "api/configuration/remove",
        body: { policyPath: "policies/policy_missing.json", versionIndex: 0, configurationIndex: 0 },
        expected: /Policy not found/u,
      },
      {
        path: "api/add-configuration",
        body: { policyPath, versionIndex: 99, type: knownType },
        expected: /Version index 99 is out of range/u,
      },
      {
        path: "api/configuration/remove",
        body: { policyPath, versionIndex: 0, configurationIndex: 99 },
        expected: /Configuration index 99 is out of range/u,
      },
    ] as const;
    for (const failure of domainFailures) {
      const response = await postJson(new URL(failure.path, handle.url), handle.apiToken, failure.body);
      assert.equal(response.status, 400, failure.path);
      assert.match(await response.text(), failure.expected, failure.path);
    }

    const moveResponse = await postJson(new URL("api/configuration/move", handle.url), handle.apiToken, {
      policyPath: "policies/policy_missing.json",
      versionIndex: 0,
      configurationIndex: 0,
      direction: "left",
    });
    assert.equal(moveResponse.status, 400);
    assert.match(await moveResponse.text(), /Unsupported move direction/u);

    const ddmResponse = await postJson(new URL("api/ddm/artifact", handle.url), handle.apiToken, {
      schemaId: "missing-schema",
      values: {},
    });
    assert.equal(ddmResponse.status, 400);
    assert.match(await ddmResponse.text(), /Unknown Apple schema entry/u);

    const missingArtifactResponse = await postJson(new URL("api/ddm/artifact/update", handle.url), handle.apiToken, {
      uuid: "missing-artifact",
      values: {},
    });
    assert.equal(missingArtifactResponse.status, 400);
    assert.match(await missingArtifactResponse.text(), /Unknown DDM artifact/u);

    const importResponse = await postJson(new URL("api/import", handle.url), handle.apiToken, {
      dataBase64: "AA==",
    });
    assert.equal(importResponse.status, 400);
    assert.match(await importResponse.text(), /Import requires an archive passphrase/u);
  } finally {
    await handle.close();
  }
});

test("editor API requires its capability token and rejects non-loopback Host headers", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-network-token-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Network token guard",
    serverVersion: bundle.serverVersion,
  });

  const handle = await startEditorServer({
    workspace,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const browserUrl = new URL(handle.browserUrl);
    const token = browserUrl.hash.startsWith("#editorToken=") ? decodeURIComponent(browserUrl.hash.slice("#editorToken=".length)) : null;
    assert.equal(new URL(handle.url).hash, "");
    assert.equal(browserUrl.searchParams.get("editorToken"), null);
    assert.equal(token, handle.apiToken);

    const blocked = await postJsonWithHost(handle.url, {
      host: "attacker.example.test",
      origin: "http://attacker.example.test",
      body: { key: "stolen-by-rebinding" },
    });
    assert.equal(blocked.status, 403);
    assert.match(blocked.body, /editor token/u);

    const wrongSameLengthToken = token?.replace(/./gu, (char) => (char === "x" ? "y" : "x")) ?? "";
    const wrongToken = await postJsonWithHost(handle.url, {
      host: "attacker.example.test",
      origin: "http://attacker.example.test",
      token: wrongSameLengthToken,
      body: { key: "wrong-token" },
    });
    assert.equal(wrongToken.status, 403);
    assert.match(wrongToken.body, /editor token/u);

    const rejectedHost = await postJsonWithHost(handle.url, {
      host: "attacker.example.test",
      origin: "http://attacker.example.test",
      token: token ?? "",
      body: { key: "operator-approved" },
    });
    assert.equal(rejectedHost.status, 403);
    assert.match(rejectedHost.body, /loopback Host header/u);

    const allowed = await postJsonWithHost(handle.url, {
      host: "127.0.0.1",
      origin: "http://127.0.0.1",
      token: token ?? "",
      body: { key: "operator-approved" },
    });
    assert.equal(allowed.status, 200);
  } finally {
    await handle.close();
  }
});

test("editor runtime accepts a deterministic test capability without changing the browser handoff", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-deterministic-token-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({ workspace, platform: "IOS", name: "Deterministic token", serverVersion: bundle.serverVersion });

  await withEditorServer({ workspace, key: "", out, host: "127.0.0.1", port: 0, apiToken: "playwright-token" }, async (handle) => {
    assert.equal(handle.apiToken, "playwright-token");
    assert.equal(handle.browserUrl.endsWith("#editorToken=playwright-token"), true);
    const response = await fetch(new URL("api/state", handle.url), { headers: { "x-rexp-studio-token": handle.apiToken } });
    assert.equal(response.status, 200);
  });
});

test("default loopback editor mode rejects API reads with non-loopback Host headers", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-loopback-host-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Loopback host guard",
    serverVersion: bundle.serverVersion,
  });

  const handle = await startEditorServer({
    workspace,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const blockedGet = await getWithHost(new URL("api/state", handle.url), "attacker.example.test", handle.apiToken);
    assert.equal(blockedGet.status, 403);
    assert.match(blockedGet.body, /loopback Host header/u);

    const allowedGet = await getWithHost(new URL("api/state", handle.url), "127.0.0.1", handle.apiToken);
    assert.equal(allowedGet.status, 200);
    assert.match(allowedGet.body, /Loopback host guard/u);
  } finally {
    await handle.close();
  }
});

test("mutating API origin checks treat default HTTP ports as equivalent", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-origin-port-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Default port origin guard",
    serverVersion: bundle.serverVersion,
  });

  const handle = await startEditorServer({
    workspace,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const allowed = await postJsonWithHost(handle.url, {
      host: "127.0.0.1:80",
      origin: "http://127.0.0.1",
      token: handle.apiToken,
      body: { key: "same-origin-default-port" },
    });
    assert.equal(allowed.status, 200);
  } finally {
    await handle.close();
  }
});

test("loopback host validation accepts IPv4-mapped IPv6 loopback addresses", () => {
  assert.doesNotThrow(() => assertSafeEditorHost("::ffff:127.0.0.1"));
});

test("editor URLs bracket raw IPv6 loopback hosts", () => {
  assert.equal(editorUrlWithNetworkToken("::1", 8787, undefined), "http://[::1]:8787/");
  assert.equal(
    editorUrlWithNetworkToken("::ffff:127.0.0.1", 8787, "token"),
    "http://[::ffff:127.0.0.1]:8787/#editorToken=token",
  );
});

test("editor JSON body reader rejects excessively deep JSON before parsing", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-json-depth-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "JSON depth guard",
    serverVersion: bundle.serverVersion,
  });

  const handle = await startEditorServer({
    workspace,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const deepJson = `{"workspace":${"[".repeat(250)}0${"]".repeat(250)}}`;
    const rejected = await postRawWithHost(new URL("api/workspace", handle.url), {
      host: "127.0.0.1",
      origin: "http://127.0.0.1",
      token: handle.apiToken,
      body: deepJson,
    });
    assert.equal(rejected.status, 413);
    assert.match(rejected.body, /maximum nesting depth/u);
  } finally {
    await handle.close();
  }
});

test("editor JSON body reader counts only direct array items", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-json-array-items-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "JSON array item guard",
    serverVersion: bundle.serverVersion,
  });

  const handle = await startEditorServer({
    workspace,
    key: "",
    out,
    host: "127.0.0.1",
    port: 0,
  });

  try {
    const manyObjectFields = objectWithProperties(6_000);
    const accepted = await postRawWithHost(new URL("api/key", handle.url), {
      host: "127.0.0.1",
      origin: "http://127.0.0.1",
      token: handle.apiToken,
      body: `{"key":"array-object-commas","items":[${manyObjectFields},${manyObjectFields}]}`,
    });
    assert.equal(accepted.status, 200);

    const rejected = await postRawWithHost(new URL("api/key", handle.url), {
      host: "127.0.0.1",
      origin: "http://127.0.0.1",
      token: handle.apiToken,
      body: `{"key":"too-many-items","items":[${Array.from({ length: 10_001 }, () => "0").join(",")}]}`,
    });
    assert.equal(rejected.status, 413);
    assert.match(rejected.body, /JSON array exceeds 10000 items/u);
  } finally {
    await handle.close();
  }
});

test("editor server closes gracefully and releases its port", async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-editor-close-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Graceful close",
    serverVersion: bundle.serverVersion,
  });

  let releasedPort = 0;
  await withEditorServer({ workspace, key: "", out, host: "127.0.0.1", port: 0 }, async (handle) => {
    const response = await fetch(new URL("api/state", handle.url), { headers: { "x-rexp-studio-token": handle.apiToken } });
    assert.equal(response.status, 200, "server should respond before close");
    releasedPort = Number(new URL(handle.url).port);
  });

  assert.equal(Number.isSafeInteger(releasedPort) && releasedPort > 0, true, "server should expose a real port");
  await withEditorServer({ workspace, key: "", out, host: "127.0.0.1", port: releasedPort }, async (handle) => {
    assert.equal(Number(new URL(handle.url).port), releasedPort, "closed server port should be reusable");
  });
});

test("workspace save double-fault reports rollback failures and leaves the server responsive", { skip: process.platform === "win32" }, async () => {
  const root = mkdtempSync(join(tmpdir(), "relution-workspace-double-fault-"));
  const workspace = join(root, "workspace");
  const out = join(root, "output.rexp");
  const bundle = loadTemplateBundle();
  const initialWorkspace = createNewWorkspace({
    workspace,
    platform: "IOS",
    name: "Rollback double fault",
    serverVersion: bundle.serverVersion,
  });
  saveEditorSidecar(workspace, EMPTY_SIDECAR);

  const nextWorkspace = structuredClone(initialWorkspace);
  nextWorkspace.policies[0]!.document.name = "Rollback double fault mutated";

  await withEditorServer({ workspace, key: "", out, host: "127.0.0.1", port: 0 }, async (handle) => {
    chmodSync(root, 0o500);
    try {
      const failed = await postJson(new URL("api/workspace", handle.url), handle.apiToken, { workspace: nextWorkspace });
      const failedBody = await failed.text();
      assert.equal(failed.status, 500);
      assert.match(failedBody, /Internal editor error/u);
      assert.doesNotMatch(failedBody, /rollback failed/u);
    } finally {
      chmodSync(root, 0o700);
    }

    const state = await fetch(new URL("api/state", handle.url), { headers: { "x-rexp-studio-token": handle.apiToken } });
    assert.equal(state.status, 200, await state.text());
  });
});
