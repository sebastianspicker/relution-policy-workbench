/** Provides HTTP and payload helpers for editor runtime tests. */
import { request as httpRequest } from "node:http";

export async function postJson(url: URL, apiToken: string, value: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-rexp-studio-token": apiToken },
    body: JSON.stringify(value),
  });
}

export function getWithHost(url: URL, host: string, apiToken: string): Promise<{ status: number; body: string }> {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest(
      { hostname: url.hostname, port: Number(url.port), path: url.pathname, method: "GET", headers: { host, "x-rexp-studio-token": apiToken } },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => resolveRequest({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    request.on("error", rejectRequest);
    request.end();
  });
}

export function objectWithProperties(count: number): string {
  return `{${Array.from({ length: count }, (_, index) => `"p${String(index)}":${String(index)}`).join(",")}}`;
}

export function postJsonWithHost(
  baseUrl: string,
  options: { host: string; origin: string; token?: string; body: unknown },
): Promise<{ status: number; body: string }> {
  const url = new URL("api/key", baseUrl);
  const body = JSON.stringify(options.body);
  return requestWithHost(url, "POST", body, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
    host: options.host,
    origin: options.origin,
    ...(typeof options.token === "undefined" ? {} : { "x-rexp-studio-token": options.token }),
  });
}

export function postRawWithHost(
  url: URL,
  options: { host: string; origin: string; token: string; body: string },
): Promise<{ status: number; body: string }> {
  return requestWithHost(url, "POST", options.body, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(options.body),
    host: options.host,
    origin: options.origin,
    "x-rexp-studio-token": options.token,
  });
}

function requestWithHost(
  url: URL,
  method: "GET" | "POST",
  body: string | undefined,
  headers: Record<string, string | number>,
): Promise<{ status: number; body: string }> {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest(
      { hostname: url.hostname, port: Number(url.port), path: url.pathname, method, headers },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => resolveRequest({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    request.on("error", rejectRequest);
    request.end(body);
  });
}
