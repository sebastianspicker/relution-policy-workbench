/** Verifies service request headers accept every Fetch HeadersInit representation. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHttpConnectionInput } from "../src/connection-normalization.js";
import { fetchServiceApi } from "../src/service-api-request.js";

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
