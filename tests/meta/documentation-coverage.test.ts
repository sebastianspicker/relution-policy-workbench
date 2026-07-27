// Enforce a visible module header across maintainable first-party code and test files.
import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const DOCUMENTED_ROOTS = [".github", "src", "web/src", "tools", "tests"] as const;
const DOCUMENTED_ROOT_FILES = [
  ".gitignore",
  "tests/relution-docker/compose.yml",
  "playwright.config.ts",
  "playwright.readme.config.ts",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
  "web/index.html",
] as const;
const DOCUMENTED_EXTENSIONS = new Set([".css", ".html", ".mjs", ".py", ".toml", ".ts", ".tsx", ".yaml", ".yml"]);
const SKIPPED_DIRECTORIES = new Set(["__pycache__"]);

test("maintainable first-party files start with a module header", () => {
  const files = [
    ...DOCUMENTED_ROOTS.flatMap((root) => documentedFiles(root)),
    ...DOCUMENTED_ROOT_FILES,
  ].sort();
  const undocumented = files.filter((path) => !hasModuleDocumentation(path));

  assert.deepEqual(undocumented, []);
});

/** Collect maintainable files without following symlinks outside the declared roots. */
function documentedFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink()) {
      return [];
    }
    if (stats.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry) ? [] : documentedFiles(path);
    }
    return DOCUMENTED_EXTENSIONS.has(extname(path)) ? [path] : [];
  });
}

/** Recognize supported module-header syntax without claiming to judge prose quality. */
function hasModuleDocumentation(path: string): boolean {
  const lines = readFileSync(path, "utf8").split(/\r?\n/u);
  if (lines[0]?.startsWith("#!")) {
    lines.shift();
  }
  const extension = extname(path);
  if (extension === ".py") {
    const firstPythonLine = lines.find((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !/^#\s*(?:coding|pylint|ruff|type:|noqa)/u.test(trimmed);
    })?.trim();
    return firstPythonLine?.startsWith('"""') === true || firstPythonLine?.startsWith("'''") === true;
  }

  const firstLine = lines.find((line) => line.trim().length > 0)?.trim() ?? "";
  if (extension === ".css") {
    return firstLine.startsWith("/*");
  }
  if (extension === ".html") {
    return firstLine.startsWith("<!--");
  }
  if (extension === ".toml" || extension === ".yaml" || extension === ".yml" || path === ".gitignore") {
    return firstLine.startsWith("#");
  }
  if (extension === ".json") {
    return firstLine.startsWith("// ");
  }
  return firstLine.startsWith("/*") || (
    firstLine.startsWith("// ")
    && !/^\/\/\s+(?:@|eslint|biome|prettier|cspell|istanbul)/u.test(firstLine)
  );
}
