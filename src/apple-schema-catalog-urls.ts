/** Builds and validates the only remote URLs allowed during catalog refreshes. */
import { isKnownAppleSchemaSourcePath } from "./apple-schema-catalog-storage.js";

const GITHUB_API_ROOT = "https://api.github.com/repos/apple/device-management/contents";
const GITHUB_RAW_ROOT = "https://raw.githubusercontent.com/apple/device-management";

export function appleSchemaGithubApiUrl(path: string, revision: string): URL {
  assertKnownAppleSchemaSourcePath(path);
  const url = new URL(`${GITHUB_API_ROOT}/${path}`);
  url.searchParams.set("ref", revision);
  return url;
}

export function appleSchemaRawDocumentUrl(path: string, name: string, revision: string): URL {
  assertKnownAppleSchemaSourcePath(path);
  if (!name.endsWith(".yaml") || name.includes("/") || name.includes("\\")) {
    throw new Error(`Unexpected Apple schema document name: ${name}`);
  }
  return new URL(`${GITHUB_RAW_ROOT}/${encodeURIComponent(revision)}/${path}/${encodeURIComponent(name)}`);
}

export async function fetchAppleSchemaUrl(url: URL): Promise<Response> {
  assertExpectedAppleSchemaUrl(url);
  return await globalThis.fetch(url);
}

export function assertExpectedAppleSchemaDownloadUrl(value: string | undefined, expected: URL): void {
  if (value === undefined) return;
  const parsed = parseAppleSchemaDownloadUrl(value);
  const expectedPrefix = expected.pathname.split("/").slice(0, 4).join("/");
  if (!isExpectedAppleSchemaDownloadUrl(parsed, expectedPrefix)) {
    unexpectedAppleSchemaDownloadUrl(value);
  }
}

function assertKnownAppleSchemaSourcePath(path: string): void {
  if (!isKnownAppleSchemaSourcePath(path)) throw new Error(`Unexpected Apple schema source path: ${path}`);
}

function assertExpectedAppleSchemaUrl(url: URL): void {
  if (url.protocol !== "https:" || (url.hostname !== "api.github.com" && url.hostname !== "raw.githubusercontent.com")) {
    throw new Error(`Unexpected Apple schema URL: ${url.href}`);
  }
}

function parseAppleSchemaDownloadUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    return unexpectedAppleSchemaDownloadUrl(value);
  }
}

function unexpectedAppleSchemaDownloadUrl(value: string): never {
  throw new Error(`Unexpected Apple schema download URL: ${value}`);
}

function isExpectedAppleSchemaDownloadUrl(url: URL, expectedPrefix: string): boolean {
  return url.protocol === "https:" && url.hostname === "raw.githubusercontent.com" && url.pathname.startsWith(`${expectedPrefix}/`);
}
