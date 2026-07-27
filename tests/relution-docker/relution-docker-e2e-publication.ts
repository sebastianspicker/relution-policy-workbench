// Supports Relution Docker end-to-end test scenarios and helpers.
import assert from "node:assert/strict";
import { authHeaders, fetchRelutionManagementApi } from "./relution-docker-e2e-api.js";
import {
  configurationsHaveTypes,
  configurationTypes,
} from "./relution-docker-e2e-configuration-types.js";
import { delay } from "./relution-docker-e2e-docker.js";
import type {
  PolicyConfiguration,
  PolicyConfigurationWrapper,
  PolicyVersion,
  PolicyVersionWrapper,
} from "./relution-docker-e2e-types.js";

export async function publishFirstPolicyVersion(policyUuid: string): Promise<string> {
  const versionsResponse = await fetchRelutionManagementApi(["policies", policyUuid, "versions"], {
    headers: authHeaders(),
  });
  const versionsBody = await versionsResponse.text();
  assert.equal(versionsResponse.ok, true, versionsBody);
  const versions = JSON.parse(versionsBody) as PolicyVersionWrapper;
  const versionUuid = versions.results?.find((version) => version.uuid !== undefined)?.uuid;
  if (versionUuid === undefined) {
    throw new Error(`Imported policy has no version UUID: ${versionsBody}`);
  }
  const publishResponse = await fetchRelutionManagementApi(
    ["policies", policyUuid, "versions", versionUuid, "publish"],
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Version 1", description: "Published by local Docker E2E" }),
    },
  );
  const publishBody = await publishResponse.text();
  assert.equal(publishResponse.ok, true, publishBody);
  return versionUuid;
}

export async function waitForPublishedConfigurations(
  policyUuid: string,
  versionUuid: string,
): Promise<PolicyConfiguration[]> {
  return waitForPublishedConfigurationsWithTypes(
    policyUuid,
    versionUuid,
    ["APPLE_MOBILECONFIG"],
  );
}

export async function waitForPublishedConfigurationsWithTypes(
  policyUuid: string,
  versionUuid: string,
  expectedTypes: string[],
): Promise<PolicyConfiguration[]> {
  const deadline = Date.now() + 60_000;
  let lastState = "";
  while (Date.now() < deadline) {
    const version = await fetchPolicyVersion(policyUuid, versionUuid);
    lastState = version === undefined
      ? "missing"
      : `${version.state ?? "no-state"} with ${String(version.configurations?.length ?? 0)} configs`;
    if (
      version?.state === "PUBLISHED"
      && configurationsHaveTypes(version.configurations ?? [], expectedTypes)
    ) {
      return version.configurations ?? [];
    }
    const configurations = await fetchPolicyVersionConfigurations(policyUuid, versionUuid);
    if (configurationsHaveTypes(configurations, expectedTypes)) {
      return configurations;
    }
    await delay(2_000);
  }
  return throwMissingConfigurationError(
    policyUuid,
    versionUuid,
    expectedTypes,
    lastState,
  );
}

async function throwMissingConfigurationError(
  policyUuid: string,
  versionUuid: string,
  expectedTypes: string[],
  lastState: string,
): Promise<never> {
  const configurations = await fetchPolicyVersionConfigurations(policyUuid, versionUuid);
  const availableTypes = configurationTypes(configurations);
  const missingTypes = expectedTypes.filter((type) => !availableTypes.includes(type));
  throw new Error(
    `Published version ${versionUuid} did not expose expected configurations ${missingTypes.join(", ")}: ${lastState}; available types: ${availableTypes.join(", ")}`,
  );
}

async function fetchPolicyVersion(
  policyUuid: string,
  versionUuid: string,
): Promise<PolicyVersion | undefined> {
  const wrapper = await fetchPolicyVersionResource<PolicyVersionWrapper>(policyUuid, versionUuid);
  return wrapper.results?.[0];
}

async function fetchPolicyVersionConfigurations(
  policyUuid: string,
  versionUuid: string,
): Promise<PolicyConfiguration[]> {
  const wrapper = await fetchPolicyVersionResource<PolicyConfigurationWrapper>(
    policyUuid,
    versionUuid,
    "configurations",
  );
  return wrapper.results ?? [];
}

async function fetchPolicyVersionResource<T>(
  policyUuid: string,
  versionUuid: string,
  suffix?: string,
): Promise<T> {
  const segments = ["policies", policyUuid, "versions", versionUuid];
  if (suffix !== undefined) {
    segments.push(suffix);
  }
  const response = await fetchRelutionManagementApi(
    segments,
    { headers: authHeaders() },
  );
  const body = await response.text();
  assert.equal(response.ok, true, body);
  return JSON.parse(body) as T;
}
