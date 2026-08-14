/** Verifies service request headers accept every Fetch HeadersInit representation. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHttpConnectionInput } from "../src/connection-normalization.js";
import type { HttpServiceTransportOptions } from "../src/http-service-transport.js";
import { relutionFetch } from "../src/relution-transport.js";
import { createServiceNetworkError, fetchServiceApi } from "../src/service-api-request.js";
import type { RelutionConnection } from "../src/relution-api-types.js";
import { zammadFetch } from "../src/zammad-api-request.js";
import type { ZammadConnection } from "../src/zammad-api-contract.js";

const connection = normalizeHttpConnectionInput({
  host: "service.example.test",
  serviceName: "Test service",
});

test("normalizes Headers and tuple request headers without dropping service headers", async () => {
  const cases: Array<{ headers: HeadersInit; expectedCustomHeader: [string, string] }> = [
    { headers: new Headers([["X-Custom", "from-headers"]]), expectedCustomHeader: ["x-custom", "from-headers"] },
    { headers: [["X-Custom", "from-tuples"]], expectedCustomHeader: ["X-Custom", "from-tuples"] },
  ];
  for (const { headers, expectedCustomHeader } of cases) {
    const normalized = await requestHeaders(headers, { Authorization: "Token test" });
    assert.equal(normalized.get("authorization"), "Token test");
    assert.equal(normalized.get(expectedCustomHeader[0]), expectedCustomHeader[1]);
  }
});

test("makes service-controlled headers authoritative regardless of caller casing", async () => {
  const normalized = await requestHeaders(
    [["authorization", "Bearer caller-token"], ["X-Custom", "caller-value"]],
    { Authorization: "Token service-token" },
  );
  assert.equal(normalized.get("authorization"), "Token service-token");
  assert.equal(normalized.get("x-custom"), "caller-value");
});

test("creates named network errors without losing the original cause", () => {
  const cause = new TypeError("socket closed");
  const error = createServiceNetworkError("RelutionNetworkError")("Relution request failed", cause);

  assert.equal(error.name, "RelutionNetworkError");
  assert.equal(error.message, "Relution request failed");
  assert.equal(error.cause, cause);
});

test("preserves service-specific network error details for failed requests", async () => {
  const cause = new TypeError("socket closed");
  const transportOptions: HttpServiceTransportOptions = {
    adapter: {
      resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
      request: async () => { throw cause; },
    },
  };
  const relutionConnection: RelutionConnection = {
    protocol: "https",
    host: "relution.example.test",
    basePath: "",
    apiToken: "relution-token",
    baseUrl: "https://relution.example.test",
    allowLocalServiceHosts: false,
    mode: "read-only",
  };
  const zammadConnection: ZammadConnection = {
    protocol: "https",
    host: "zammad.example.test",
    basePath: "",
    apiToken: "zammad-token",
    group: "IT",
    customer: "it@example.test",
    baseUrl: "https://zammad.example.test",
    allowLocalServiceHosts: false,
  };

  await assert.rejects(
    relutionFetch(relutionConnection, "/api/v2/devices/baseInfo/query", { method: "POST" }, transportOptions),
    (error) => assertNetworkError(error, "RelutionNetworkError", "Relution", cause),
  );
  await assert.rejects(
    zammadFetch(zammadConnection, "/api/v1/users/me", { method: "GET" }, transportOptions),
    (error) => assertNetworkError(error, "ZammadNetworkError", "Zammad", cause),
  );
});

async function requestHeaders(headers: HeadersInit, serviceHeaders: Record<string, string>): Promise<Headers> {
  let observedHeaders: HeadersInit | undefined;
  const response = await fetchServiceApi({
    connection,
    serviceName: "Test service",
    path: "/api/items",
    init: { headers },
    serviceHeaders,
    createNetworkError: (message, cause) => new Error(message, { cause }),
    transportOptions: {
      adapter: {
        resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
        request: async (_url, init) => {
          observedHeaders = init.headers;
          return new Response("ok");
        },
      },
    },
  });
  assert.equal(await response.text(), "ok");
  return new Headers(observedHeaders);
}

function assertNetworkError(error: unknown, name: string, serviceName: string, cause: Error): boolean {
  assert.equal(error instanceof Error, true);
  assert.equal((error as Error).name, name);
  assert.equal((error as Error).message, `${serviceName} API request failed before an HTTP response: socket closed`);
  assert.equal((error as Error).cause, cause);
  return true;
}
