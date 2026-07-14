import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import { type ServerResponse } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { shouldServeSpaIndex } from "./editor-server-helpers.js";
import { resolveSymlinkFreePath } from "./utils/path-safety.js";

export function serveStaticAsset(staticRoot: string, pathname: string, response: ServerResponse): void {
  const file = resolveStaticAssetPath(staticRoot, pathname);
  if (!existsSync(file)) {
    sendText(response, 404, "Editor assets are missing. Run pnpm build first.");
    return;
  }
  const type = contentType(file);
  if (type === undefined) {
    sendText(response, 404, "Editor asset type is not supported.");
    return;
  }
  let contents: Buffer;
  try {
    contents = readStaticFileNoFollow(file);
  } catch {
    sendText(response, 404, "Editor asset is not available.");
    return;
  }
  response.writeHead(200, securityHeaders(type));
  response.end(contents);
}

export function resolveStaticAssetPath(staticRoot: string, pathname: string): string {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(staticRoot, relativePath);
  const resolvedRoot = resolve(staticRoot);
  const index = join(resolvedRoot, "index.html");
  const withinRoot = candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${sep}`);
  if (!withinRoot) {
    return index;
  }
  if (isSafeStaticFile(resolvedRoot, candidate)) {
    return candidate;
  }
  if (existsSync(candidate)) {
    return index;
  }
  return shouldServeSpaIndex(pathname) ? index : candidate;
}

function isSafeStaticFile(staticRoot: string, candidate: string): boolean {
  if (!existsSync(candidate) || lstatSync(candidate).isSymbolicLink() || !lstatSync(candidate).isFile()) {
    return false;
  }
  try {
    const realRoot = realpathSync(staticRoot);
    const realCandidate = realpathSync(candidate);
    const fromRoot = relative(realRoot, realCandidate);
    return fromRoot.length === 0 || (!isAbsolute(fromRoot) && !fromRoot.startsWith(`..${sep}`) && fromRoot !== "..");
  } catch {
    return false;
  }
}

function readStaticFileNoFollow(path: string): Buffer {
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    return readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function securityHeaders(type: string): Record<string, string> {
  return {
    "content-type": type,
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
    ...(type.startsWith("text/html") ? { "cache-control": "no-store" } : {}),
  };
}

export function outputFileName(path: string): string {
  const basename = path.split(/[\\/]/u).at(-1) ?? "output.rexp";
  const safe = basename.replace(/[^A-Za-z0-9._-]/gu, "_");
  return safe.length === 0 || /^\.+$/u.test(safe) ? "output.rexp" : safe;
}

export function readOutputFileNoFollow(path: string): Buffer {
  const resolved = resolveSymlinkFreePath(path, "Editor output path");
  const descriptor = openSync(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new Error(`Editor output is not a regular file: ${path}`);
    }
    return readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function sendText(response: ServerResponse, status: number, value: string): void {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "cache-control": "no-store",
  });
  response.end(value);
}

function contentType(path: string): string | undefined {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return undefined;
  }
}
