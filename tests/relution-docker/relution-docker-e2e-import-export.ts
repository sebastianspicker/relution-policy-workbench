// Supports Relution Docker end-to-end test scenarios and helpers.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyRexp } from "../../src/rexp.js";
import { authHeaders, fetchRelutionManagementApi } from "./relution-docker-e2e-api.js";
import { archiveSecret } from "./relution-docker-e2e-config.js";
import type { PolicyImportReport } from "./relution-docker-e2e-types.js";

export async function importPolicy(path: string): Promise<PolicyImportReport> {
  const bytes = readFileSync(path);
  const form = new FormData();
  form.set("encryptionKey", archiveSecret);
  form.set("file", new Blob([bytes]), path.split("/").at(-1) ?? "policy.rexp");
  const response = await fetchRelutionManagementApi(["policies", "import"], {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  const body = await response.text();
  assert.equal(response.ok, true, body);
  return JSON.parse(body) as PolicyImportReport;
}

export async function importBaselineTemplate(
  path: string,
  label: string,
): Promise<PolicyImportReport> {
  const importReport = await importPolicy(path);
  assert.deepEqual(importReport.errors ?? [], [], `${label}: import errors`);
  assert.equal(
    Object.keys(importReport.failedPolicies ?? {}).length,
    0,
    `${label}: failed policy imports ${JSON.stringify(importReport.failedPolicies)}`,
  );
  return importReport;
}

async function exportPolicy(policyUuid: string): Promise<Blob> {
  const response = await fetchRelutionManagementApi(["policies", "export"], {
    method: "POST",
    headers: {
      ...authHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      policyUuids: [policyUuid],
      encryptionKey: Array.from(archiveSecret),
      cipherSpecVersion: 1,
      digestSpecVersion: 1,
      archiveFormatVersion: 1,
      fileFormatVersion: 1,
    }),
  });
  const body = await response.blob();
  assert.equal(response.ok, true, await body.text());
  return body;
}

export async function writeVerifiedExportedPolicy(
  policyUuid: string,
  path: string,
  message?: string,
): Promise<void> {
  const exportedArchive = await exportPolicy(policyUuid);
  writeFileSync(path, new Uint8Array(await exportedArchive.arrayBuffer()));
  assert.equal(verifyRexp(path, archiveSecret).ok, true, message);
}
