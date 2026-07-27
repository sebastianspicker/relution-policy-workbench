/** Enforces repository hygiene boundaries for public files and local artifacts. */
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, relative } from "node:path";

test("project-managed trees do not contain local OS or Python cache artifacts", () => {
  const unwantedArtifacts = findUnwantedArtifacts(resolve("."));
  assert.deepEqual(unwantedArtifacts, []);
});

test("tracked and public-candidate files respect the public/private boundary", () => {
  const reviewedRexpFixtures = new Set([
    "example/Windows Group Policy Definitions.rexp",
    "example/Windows Policies Win11 24H2.rexp",
    "example/Windows Security Baselines Edge v128.rexp",
    "example/Windows Security Baselines Win11 24H2.rexp",
    "example/sample-policy-export.rexp",
  ]);
  const forbiddenExtensions = [
    ".cer",
    ".asc",
    ".crt",
    ".csr",
    ".der",
    ".jks",
    ".kdbx",
    ".key",
    ".keystore",
    ".mobileconfig",
    ".mobileprovision",
    ".ovpn",
    ".p12",
    ".pem",
    ".pfx",
    ".pgp",
    ".gpg",
  ];
  const forbiddenBasenames = new Set([".netrc", ".npmrc", ".pypirc", "editor-sidecar.json"]);
  const publicFiles = publicCandidateFiles();
  const violations = publicFiles.filter((path) => {
    const lowerPath = path.toLowerCase();
    const basename = lowerPath.split("/").at(-1) ?? lowerPath;
    if (path === ".env.example") return false;
    if (lowerPath === ".env" || lowerPath.startsWith(".env.")) return true;
    if (lowerPath.startsWith("private/")) return true;
    if (forbiddenBasenames.has(basename)) return true;
    if (lowerPath.endsWith(".rexp")) return !reviewedRexpFixtures.has(path);
    return forbiddenExtensions.some((extension) => lowerPath.endsWith(extension));
  });

  assert.deepEqual(violations, []);
});

test("tracked and public-candidate text does not expose this checkout's local home path", () => {
  const localHomePaths = [homedir(), process.env.USERPROFILE]
    .filter((path): path is string => Boolean(path))
    .flatMap((path) => [path.replaceAll("\\", "/"), path.replaceAll("/", "\\")]);
  const violations = publicCandidateFiles().filter((path) => {
    const content = readFileSync(path);
    if (content.includes(0)) return false;
    const text = content.toString("utf8");
    return localHomePaths.some((localHomePath) => text.includes(`${localHomePath}/`) || text.includes(`${localHomePath}\\`));
  });
  assert.deepEqual(violations, []);
});

test("tracked and public-candidate text does not retain the former product brand", () => {
  const formerSlug = ["relution", "policy", "workbench"].join("-");
  const formerTitle = ["Relution", "Policy", "Workbench"].join(" ");
  const violations = publicCandidateFiles().filter((path) => {
    const content = readFileSync(path);
    if (content.includes(0)) return false;
    const text = content.toString("utf8");
    return text.includes(formerSlug) || text.includes(formerTitle);
  });

  assert.deepEqual(violations, []);
});

function publicCandidateFiles(): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter((path) => path.length > 0 && existsSync(path));
}

function findUnwantedArtifacts(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory() && shouldSkipDirectory(entry)) {
      continue;
    }
    if (stats.isDirectory()) {
      if (entry === "__pycache__") {
        found.push(relative(resolve("."), path));
        continue;
      }
      found.push(...findUnwantedArtifacts(path));
      continue;
    }
    if (entry === ".DS_Store" || entry.endsWith(".pyc")) {
      found.push(relative(resolve("."), path));
    }
  }
  return found.sort();
}

function shouldSkipDirectory(entry: string): boolean {
  return entry === ".git" || entry === "node_modules" || entry === ".venv" || entry === "dist" || entry === "dist-web" || entry === ".rexp-editor" || entry === "private";
}
