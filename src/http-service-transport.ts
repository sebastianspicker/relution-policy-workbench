import { request as httpRequest, type IncomingMessage, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction, type TcpNetConnectOpts } from "node:net";
import {
  formatHttpUrlAuthority,
  normalizeHttpHostname,
  type NormalizedConnectionBase,
} from "./connection-normalization.js";
import { resolveAllowedServiceAddresses, type ResolvedServiceAddress } from "./outbound-host-policy.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_RESPONSE_LIMIT_BYTES = 16 * 1024 * 1024;

export interface HttpServiceTransportAdapter {
  resolveAddresses: (
    serviceName: string,
    hostname: string,
    allowLocalServiceHosts: boolean,
    signal?: AbortSignal,
  ) => Promise<ResolvedServiceAddress[]>;
  request: (
    url: URL,
    init: RequestInit,
    addresses: readonly ResolvedServiceAddress[],
    maxResponseBytes: number,
  ) => Promise<Response>;
}

export interface HttpServiceTransportOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
  adapter?: HttpServiceTransportAdapter;
}

const secureTransportAdapter: HttpServiceTransportAdapter = {
  resolveAddresses: async (serviceName, hostname, allowLocalServiceHosts) =>
    await resolveAllowedServiceAddresses(serviceName, hostname, allowLocalServiceHosts),
  request: requestPinnedHttpServiceUrl,
};

export function httpServiceRequestUrl(
  connection: NormalizedConnectionBase,
  path: string,
  serviceName: string,
): URL {
  assertServicePath(connection.basePath, serviceName);
  assertServicePath(path, serviceName);
  const origin = `${connection.protocol}://${formatHttpUrlAuthority(connection.host, connection.port)}`;
  const url = new URL(`${connection.basePath}${path}`, origin);
  if (!isConfiguredServiceUrl(connection, url) || url.pathname !== `${connection.basePath}${path}`) {
    throw new Error(`${serviceName} API path resolves outside configured service root: ${path}`);
  }
  return url;
}

export async function fetchHttpServiceUrl(
  connection: NormalizedConnectionBase,
  url: URL,
  init: RequestInit,
  serviceName: string,
  options: HttpServiceTransportOptions = {},
): Promise<Response> {
  assertHttpServiceUrl(connection, url, serviceName);
  const timeoutMs = positiveSafeInteger(options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS, "HTTP service request timeout");
  const maxResponseBytes = positiveSafeInteger(options.maxResponseBytes ?? DEFAULT_RESPONSE_LIMIT_BYTES, "HTTP service response limit");
  const adapter = options.adapter ?? secureTransportAdapter;
  const deadline = requestDeadline(init.signal, timeoutMs);
  try {
    const addresses = await waitForAbort(
      adapter.resolveAddresses(serviceName, url.hostname, connection.allowLocalServiceHosts, deadline.signal),
      deadline.signal,
    );
    if (addresses.length === 0) {
      throw new Error(`${serviceName} host resolution returned no approved addresses`);
    }
    const requestInit: RequestInit = {
      ...init,
      redirect: "manual",
      signal: deadline.signal,
    };
    const response = await adapter.request(url, requestInit, addresses, maxResponseBytes);
    if (isRedirectStatus(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`${serviceName} API redirects are not allowed`);
    }
    return await responseWithinLimit(response, maxResponseBytes, serviceName);
  } finally {
    deadline.dispose();
  }
}

async function waitForAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw signal.reason;
  let rejectOnAbort!: (reason: unknown) => void;
  const aborted = new Promise<never>((_resolve, reject) => { rejectOnAbort = reject; });
  const onAbort = (): void => rejectOnAbort(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function requestDeadline(parentSignal: AbortSignal | null | undefined, timeoutMs: number): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`HTTP service request exceeded ${String(timeoutMs)}ms`)), timeoutMs);
  const forwardAbort = (): void => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted === true) {
    forwardAbort();
  } else {
    parentSignal?.addEventListener("abort", forwardAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}

async function requestPinnedHttpServiceUrl(
  url: URL,
  init: RequestInit,
  addresses: readonly ResolvedServiceAddress[],
  maxResponseBytes: number,
): Promise<Response> {
  const body = requestBodyBuffer(init.body);
  const headers = new Headers(init.headers);
  headers.set("host", url.host);
  headers.set("accept-encoding", "identity");
  headers.delete("connection");
  if (body !== undefined && !headers.has("content-length")) {
    headers.set("content-length", String(body.length));
  }
  const requestOptions: RequestOptions & Pick<TcpNetConnectOpts, "autoSelectFamily" | "autoSelectFamilyAttemptTimeout"> = {
    method: init.method ?? "GET",
    hostname: normalizedUrlHostname(url.hostname),
    path: `${url.pathname}${url.search}`,
    headers: Object.fromEntries(headers.entries()),
    lookup: approvedAddressLookup(url.hostname, addresses),
    autoSelectFamily: addresses.length > 1,
    autoSelectFamilyAttemptTimeout: 250,
    agent: false,
    ...(url.port.length === 0 ? {} : { port: Number(url.port) }),
    ...(init.signal === undefined || init.signal === null ? {} : { signal: init.signal }),
  };
  return await new Promise<Response>((resolveResponse, rejectResponse) => {
    const onResponse = (incoming: IncomingMessage): void => {
      void incomingMessageToResponse(incoming, maxResponseBytes).then(resolveResponse, rejectResponse);
    };
    const request = url.protocol === "https:"
      ? httpsRequest({
        ...requestOptions,
        ...(tlsServerName(url.hostname) === undefined ? {} : { servername: tlsServerName(url.hostname) }),
      }, onResponse)
      : httpRequest(requestOptions, onResponse);
    request.once("error", rejectResponse);
    request.end(body);
  });
}

function approvedAddressLookup(expectedHostname: string, addresses: readonly ResolvedServiceAddress[]): LookupFunction {
  const normalizedExpectedHostname = normalizedUrlHostname(expectedHostname).toLowerCase();
  return (hostname, options, callback): void => {
    if (normalizedUrlHostname(hostname).toLowerCase() !== normalizedExpectedHostname) {
      callback(Object.assign(new Error("Pinned HTTP lookup received an unexpected hostname"), { code: "EHOSTUNREACH" }), "");
      return;
    }
    if (options.all) {
      callback(null, addresses.map(({ address, family }) => ({ address, family })));
      return;
    }
    const first = addresses[0];
    if (first === undefined) {
      callback(Object.assign(new Error("Pinned HTTP lookup has no approved address"), { code: "EHOSTUNREACH" }), "");
      return;
    }
    callback(null, first.address, first.family);
  };
}

function normalizedUrlHostname(hostname: string): string {
  return hostname.replace(/^\[(.*)\]$/u, "$1");
}

function tlsServerName(hostname: string): string | undefined {
  const normalized = normalizedUrlHostname(hostname);
  return isIP(normalized) === 0 ? normalized : undefined;
}

async function incomingMessageToResponse(incoming: IncomingMessage, maxResponseBytes: number): Promise<Response> {
  const declaredLength = contentLength(incoming.headers["content-length"]);
  if (declaredLength !== undefined && declaredLength > maxResponseBytes) {
    incoming.destroy();
    throw new Error(`HTTP service response exceeds ${String(maxResponseBytes)} bytes`);
  }
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of incoming) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxResponseBytes) {
      incoming.destroy();
      throw new Error(`HTTP service response exceeds ${String(maxResponseBytes)} bytes`);
    }
    chunks.push(buffer);
  }
  const headers = new Headers();
  for (const [name, rawValue] of Object.entries(incoming.headers)) {
    for (const value of Array.isArray(rawValue) ? rawValue : rawValue === undefined ? [] : [rawValue]) {
      headers.append(name, value);
    }
  }
  const bytes = Buffer.concat(chunks);
  return new Response(bytes.length === 0 ? null : bytes, {
    status: incoming.statusCode ?? 500,
    statusText: incoming.statusMessage ?? "",
    headers,
  });
}

async function responseWithinLimit(response: Response, maxResponseBytes: number, serviceName: string): Promise<Response> {
  const declaredLength = contentLength(response.headers.get("content-length"));
  if (declaredLength !== undefined && declaredLength > maxResponseBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`${serviceName} API response exceeds ${String(maxResponseBytes)} bytes`);
  }
  if (response.body === null) {
    return response;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        throw new Error(`${serviceName} API response exceeds ${String(maxResponseBytes)} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new Response(bytes.length === 0 ? null : bytes, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function requestBodyBuffer(body: BodyInit | null | undefined): Buffer | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return Buffer.from(body);
  if (body instanceof URLSearchParams) return Buffer.from(body.toString());
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  throw new Error("HTTP service request body type is not supported");
}

function contentLength(value: string | string[] | null | undefined): number | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  if (text === undefined || text === null || !/^\d+$/u.test(text)) return undefined;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function positiveSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return value;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function assertHttpServiceUrl(connection: NormalizedConnectionBase, url: URL, serviceName: string): void {
  assertServicePath(connection.basePath, serviceName);
  assertServicePath(url.pathname, serviceName);
  if (!isConfiguredServiceUrl(connection, url)) {
    throw new Error(`${serviceName} API URL resolves outside configured service root: ${url.href}`);
  }
}

function isConfiguredServiceUrl(connection: NormalizedConnectionBase, url: URL): boolean {
  return (
    url.protocol === `${connection.protocol}:`
    && normalizedUrlHostname(url.hostname) === normalizeHttpHostname(connection.host)
    && url.port === expectedUrlPort(connection.protocol, connection.port)
    && url.username.length === 0
    && url.password.length === 0
    && isWithinBasePath(url.pathname, connection.basePath)
  );
}

function isWithinBasePath(pathname: string, basePath: string): boolean {
  return basePath.length === 0 || pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function assertServicePath(path: string, serviceName: string): void {
  if (
    !path.startsWith("/") && path.length > 0
    || /(?:^|\/)(?:\.|\.\.)(?:\/|$)/u.test(path)
    || /%2e|%2f|%5c/iu.test(path)
  ) {
    throw new Error(`${serviceName} API path contains an unsafe path segment: ${path}`);
  }
}

function expectedUrlPort(protocol: NormalizedConnectionBase["protocol"], port: number | undefined): string {
  if (port === undefined || (protocol === "https" && port === 443) || (protocol === "http" && port === 80)) {
    return "";
  }
  return String(port);
}
