/** Verifies bounded outbound transport, TLS hostname handling, and failures. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHttpConnectionInput } from "../src/connection-normalization.js";
import { preparePinnedHttpServiceRequest } from "../src/http-service-node-adapter.js";
import {
  fetchHttpServiceUrl,
  httpServiceRequestUrl,
  type HttpServiceTransportAdapter,
  type HttpServiceTransportOptions,
} from "../src/http-service-transport.js";

const connection = normalizeHttpConnectionInput({
  host: "https://service.example.test:8443/customer-a",
  serviceName: "Test service",
});
const serviceUrl = httpServiceRequestUrl(connection, "/api/v1/items", "Test service");
const multipleApprovedAddresses: Array<{ address: string; family: 4 | 6 }> = [
  { address: "2606:4700:4700::1111", family: 6 },
  { address: "8.8.8.8", family: 4 },
];

async function requestService(init: RequestInit = {}, options: HttpServiceTransportOptions = {}): Promise<Response> {
  return await fetchHttpServiceUrl(connection, serviceUrl, init, "Test service", options);
}

function approvedAddressAdapter(request: HttpServiceTransportAdapter["request"]): HttpServiceTransportAdapter {
  return { resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }], request };
}

function responseAdapter(response: Response): HttpServiceTransportAdapter {
  return approvedAddressAdapter(async () => response);
}

function textStreamResponse(chunks: readonly string[], cancel?: (reason: unknown) => void): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
    ...(cancel === undefined ? {} : { cancel }),
  }));
}

async function assertSuccessfulRequest(adapter: HttpServiceTransportAdapter): Promise<void> {
  assert.equal(await (await requestService({}, { adapter })).text(), "ok");
}

async function assertDeadline(adapter: HttpServiceTransportAdapter): Promise<void> {
  await assert.rejects(requestService({}, { adapter, timeoutMs: 5 }), /exceeded 5ms/u);
}

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

test("does not disclose URL credentials, query strings, or fragments in rejected URL errors", async () => {
  const unsafeUrl = new URL("https://user:secret@other.example.test/customer-a/api/v1/items?token=query-secret#fragment-secret");
  await assert.rejects(
    fetchHttpServiceUrl(connection, unsafeUrl, {}, "Test service"),
    (error) => {
      const message = String(error);
      assert.match(message, /outside configured service root/u);
      assert.doesNotMatch(message, /user|secret|query|fragment|other\.example/u);
      return true;
    },
  );
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

  await assertSuccessfulRequest(adapter);
  assert.equal(resolutions, 1);
});

test("passes every approved address to one pinned application request", async () => {
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => multipleApprovedAddresses,
    request: async (_url, _init, addresses) => {
      requests += 1;
      assert.deepEqual(addresses, multipleApprovedAddresses);
      return new Response("ok");
    },
  };

  await assertSuccessfulRequest(adapter);
  assert.equal(requests, 1);
});

test("does not replay an application request after a request-level failure", async () => {
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => multipleApprovedAddresses,
    request: async () => {
      requests += 1;
      throw new Error("request failed after connection selection");
    },
  };

  await assert.rejects(requestService({}, { adapter }), /request failed after connection selection/u);
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

  await assert.rejects(requestService({ headers: { "X-User-Access-Token": "secret-token" } }, { adapter }), /redirects are not allowed/u);
  assert.equal(requests, 1);
});

test("bounds streamed responses even without a content-length header", async () => {
  await assert.rejects(
    requestService({}, { adapter: responseAdapter(textStreamResponse(["123", "45"])), maxResponseBytes: 4 }),
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

  await assertDeadline(adapter);
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

  await assertDeadline(adapter);
  assert.equal(requests, 0);
});

test("enforces the deadline when an adapter ignores the request signal", async () => {
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async () => await new Promise<Response>(() => undefined),
  };

  await assertDeadline(adapter);
});

test("cancels a late response after the request deadline", async () => {
  const lateResponse = deferred<Response>();
  const cancelled = deferred<unknown>();
  await assertDeadline(approvedAddressAdapter(async () => await lateResponse.promise));
  lateResponse.resolve(new Response(new ReadableStream<Uint8Array>({
    cancel(reason) {
      cancelled.resolve(reason);
    },
  })));
  await cancelled.promise;
});

test("consumes a late adapter rejection after the request deadline", async () => {
  const lateResponse = deferred<Response>();
  const unhandled: unknown[] = [];
  const onUnhandled = (error: unknown): void => { unhandled.push(error); };
  process.on("unhandledRejection", onUnhandled);
  try {
    await assertDeadline(approvedAddressAdapter(async () => await lateResponse.promise));
    lateResponse.reject(new Error("late adapter failure"));
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener("unhandledRejection", onUnhandled);
  }
});

test("aborts and cancels a pending response-body read at the deadline", async () => {
  const cancelled = deferred<unknown>();
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async () => new Response(new ReadableStream<Uint8Array>({
      pull: async () => await new Promise(() => undefined),
      cancel(reason) {
        cancelled.resolve(reason);
      },
    })),
  };

  await assertDeadline(adapter);
  assert.match(String(await cancelled.promise), /exceeded 5ms/u);
});

test("preserves the response-limit error when stream cancellation fails", async () => {
  const response = textStreamResponse(["12345"], () => { throw new Error("cancel failed"); });
  await assert.rejects(requestService({}, { adapter: responseAdapter(response), maxResponseBytes: 4 }), /response exceeds 4 bytes/u);
});

test("normalizes framing headers from the actual buffered request body", () => {
  const url = httpServiceRequestUrl(connection, "/api/v1/items", "Test service");
  const prepared = preparePinnedHttpServiceRequest(url, {
    body: "abc",
    headers: {
      "content-length": "999",
      "connection": "upgrade",
      "transfer-encoding": "chunked",
      "trailer": "digest",
      "upgrade": "websocket",
    },
  });

  assert.equal(prepared.body?.toString(), "abc");
  assert.equal(prepared.headers.get("content-length"), "3");
  assert.equal(prepared.headers.get("host"), "service.example.test:8443");
  for (const name of ["connection", "transfer-encoding", "trailer", "upgrade"]) {
    assert.equal(prepared.headers.get(name), null);
  }

  const bodyless = preparePinnedHttpServiceRequest(url, { headers: { "content-length": "42" } });
  assert.equal(bodyless.headers.get("content-length"), null);
  assert.throws(
    () => preparePinnedHttpServiceRequest(url, { body: new Blob(["abc"]) }),
    /body must be a buffered string/u,
  );
});

test("rejects unsupported bodies before invoking a custom adapter", async () => {
  let requested = false;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async () => {
      requested = true;
      return new Response("unexpected");
    },
  };

  await assert.rejects(
    requestService({ body: new Blob(["abc"]) }, { adapter }),
    /body must be a buffered string/u,
  );
  assert.equal(requested, false);
});

test("rejects outbound request bodies over the byte limit before DNS or adapter calls", async () => {
  let resolutions = 0;
  let requests = 0;
  const adapter: HttpServiceTransportAdapter = {
    resolveAddresses: async () => {
      resolutions += 1;
      return [{ address: "8.8.8.8", family: 4 }];
    },
    request: async () => {
      requests += 1;
      return new Response("unexpected");
    },
  };
  for (const body of ["éé", new Uint8Array([1, 2, 3, 4])]) {
    await assert.rejects(
      requestService({ body }, { adapter, maxRequestBytes: 3 }),
      /request body exceeds 3 bytes/u,
    );
  }
  assert.equal(resolutions, 0);
  assert.equal(requests, 0);
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
