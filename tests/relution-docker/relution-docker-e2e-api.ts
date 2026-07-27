// Supports Relution Docker end-to-end test scenarios and helpers.
import { relutionE2eApiUrl } from "./relution-docker-e2e-config.js";

const username = process.env.RELUTION_E2E_USERNAME ?? "admin";
const password = process.env.RELUTION_E2E_PASSWORD ?? "relution-e2e-admin";

export function requireRelutionE2eAccessToken(): string {
  return process.env.RELUTION_E2E_ACCESS_TOKEN ?? "local-dashboard-e2e-token";
}

export async function fetchRelutionManagementApi(
  segments: readonly string[],
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(
    relutionE2eApiUrl(["api", "management", "v1", "devices", ...segments]),
    init,
  );
  return globalThis.fetch(request);
}

export function authHeaders(): Record<string, string> {
  const token = process.env.RELUTION_E2E_MANAGEMENT_ACCESS_TOKEN;
  if (token !== undefined && token.length > 0) {
    return { "X-User-Access-Token": token };
  }
  return {
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}
