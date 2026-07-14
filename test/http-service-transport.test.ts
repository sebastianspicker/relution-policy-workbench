import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHttpConnectionInput } from "../src/connection-normalization.js";
import {
  fetchHttpServiceUrl,
  httpServiceRequestUrl,
  type HttpServiceTransportAdapter,
} from "../src/http-service-transport.js";

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

test("constructs and validates bracketed IPv6 service URLs", async () => {
  const ipv6Connection = normalizeHttpConnectionInput({
    host: "::1",
    port: 8443,
    basePath: "/customer-a",
    allowLocalServiceHosts: true,
    serviceName: "IPv6 service",
  });
  const url = httpServiceRequestUrl(ipv6Connection, "/api/v1/items", "IPv6 service");
  assert.equal(url.href, "https://[::1]:8443/customer-a/api/v1/items");

  let requested = false;
  const response = await fetchHttpServiceUrl(ipv6Connection, url, {}, "IPv6 service", {
    adapter: {
      resolveAddresses: async () => [{ address: "::1", family: 6 }],
      request: async () => {
        requested = true;
        return new Response("ok");
      },
    },
  });
  assert.equal(requested, true);
  assert.equal(await response.text(), "ok");
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

test("pins the request to an approved address without a second resolution", async () => {
  let resolutions = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => {
      resolutions += 1;
      return [{ address: "8.8.8.8", family: 4 }];
    },
    request: async (url, init, addresses) => {
      assert.deepEqual(addresses, [{ address: "8.8.8.8", family: 4 }]);
      assert.equal(url.hostname, "service.example.test");
      assert.equal(init.redirect, "manual");
      return new Response("ok");
    },
  };

  const response = await fetchHttpServiceUrl(
    connection,
    httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
    {},
    "Test service",
    { adapter },
  );

  assert.equal(await response.text(), "ok");
  assert.equal(resolutions, 1);
});

test("passes every approved address to one pinned application request", async () => {
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [
      { address: "2606:4700:4700::1111", family: 6 },
      { address: "8.8.8.8", family: 4 },
    ],
    request: async (_url, _init, addresses) => {
      requests += 1;
      assert.deepEqual(addresses, [
        { address: "2606:4700:4700::1111", family: 6 },
        { address: "8.8.8.8", family: 4 },
      ]);
      return new Response("ok");
    },
  };

  const response = await fetchHttpServiceUrl(
    connection,
    httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
    {},
    "Test service",
    { adapter },
  );
  assert.equal(await response.text(), "ok");
  assert.equal(requests, 1);
});

test("does not replay an application request after a request-level failure", async () => {
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [
      { address: "2606:4700:4700::1111", family: 6 },
      { address: "8.8.8.8", family: 4 },
    ],
    request: async () => {
      requests += 1;
      throw new Error("request failed after connection selection");
    },
  };

  await assert.rejects(
    fetchHttpServiceUrl(
      connection,
      httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
      {},
      "Test service",
      { adapter },
    ),
    /request failed after connection selection/u,
  );
  assert.equal(requests, 1);
});

test("rejects redirects without making a credentialed follow-up request", async () => {
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async (_url, init) => {
      requests += 1;
      assert.equal(new Headers(init.headers).get("X-User-Access-Token"), "secret-token");
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } });
    },
  };

  await assert.rejects(
    fetchHttpServiceUrl(
      connection,
      httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
      { headers: { "X-User-Access-Token": "secret-token" } },
      "Test service",
      { adapter },
    ),
    /redirects are not allowed/u,
  );
  assert.equal(requests, 1);
});

test("bounds streamed responses even without a content-length header", async () => {
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("123"));
        controller.enqueue(new TextEncoder().encode("45"));
        controller.close();
      },
    })),
  };

  await assert.rejects(
    fetchHttpServiceUrl(
      connection,
      httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
      {},
      "Test service",
      { adapter, maxResponseBytes: 4 },
    ),
    /response exceeds 4 bytes/u,
  );
});

test("aborts outbound requests at the configured deadline", async () => {
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async (_url, init) => await new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }),
  };

  await assert.rejects(
    fetchHttpServiceUrl(
      connection,
      httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
      {},
      "Test service",
      { adapter, timeoutMs: 5 },
    ),
    /exceeded 5ms/u,
  );
});

test("includes host resolution in the configured deadline", async () => {
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => await new Promise(() => undefined),
    request: async () => {
      requests += 1;
      return new Response("unexpected");
    },
  };

  await assert.rejects(
    fetchHttpServiceUrl(
      connection,
      httpServiceRequestUrl(connection, "/api/v1/items", "Test service"),
      {},
      "Test service",
      { adapter, timeoutMs: 5 },
    ),
    /exceeded 5ms/u,
  );
  assert.equal(requests, 0);
});
