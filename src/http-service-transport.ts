import type { NormalizedConnectionBase } from "./connection-normalization.js";

export function httpServiceRequestUrl(
  connection: NormalizedConnectionBase,
  path: string,
  serviceName: string,
): URL {
  assertServicePath(connection.basePath, serviceName);
  assertServicePath(path, serviceName);
  const origin = `${connection.protocol}://${connection.port === undefined ? connection.host : `${connection.host}:${String(connection.port)}`}`;
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
): Promise<Response> {
  assertHttpServiceUrl(connection, url, serviceName);
  return await globalThis.fetch(url, init);
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
    && url.hostname === connection.host
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
