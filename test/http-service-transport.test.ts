import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHttpConnectionInput } from "../src/connection-normalization.js";
import { fetchHttpServiceUrl, httpServiceRequestUrl } from "../src/http-service-transport.js";

const connection = normalizeHttpConnectionInput({
  host: "https://service.example.test:8443/customer-a",
  serviceName: "Test service",
});

test("constructs HTTP service URLs only below the configured root", () => {
  assert.equal(httpServiceRequestUrl(connection, "/api/v1/items", "Test service").href, "https://service.example.test:8443/customer-a/api/v1/items");
  for (const path of ["api/v1/items", "/../admin", "/%2e%2e/admin", "/%2Fadmin", "/%5cadmin"]) {
    assert.throws(() => httpServiceRequestUrl(connection, path, "Test service"), /unsafe path segment|outside configured service root/u);
  }
});

test("rejects outbound HTTP service URLs outside the configured protocol, authority, port, or path boundary", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unexpected");
  try {
    for (const url of [
      "http://service.example.test:8443/customer-a/api/v1/items",
      "https://other.example.test:8443/customer-a/api/v1/items",
      "https://service.example.test:9443/customer-a/api/v1/items",
      "https://service.example.test:8443/customer-a-escape/api/v1/items",
      "https://service.example.test:8443/customer-a/%2e%2e/admin",
      "https://service.example.test:8443/customer-a/%2Fadmin",
    ]) {
      await assert.rejects(fetchHttpServiceUrl(connection, new URL(url), {}, "Test service"), /unsafe path segment|outside configured service root/u);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
