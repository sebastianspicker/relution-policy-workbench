import { lstatSync, realpathSync, type Stats } from "node:fs";
import { join, parse, relative, resolve, sep } from "node:path";

export function assertNoSymlinkPath(rootPath: string, relativePath: string, label: string): void {
  const resolvedRoot = resolveSymlinkFreePath(rootPath, label);
  if (lstatIfPresent(resolvedRoot)?.isSymbolicLink() === true) {
    throw new Error(`${label} must not use symlinks: ${rootPath}`);
  }

  let current = resolvedRoot;
  for (const segment of relativePath.split(/[\\/]/u).filter((part) => part.length > 0)) {
    current = join(current, segment);
    const stats = lstatIfPresent(current);
    if (stats === undefined) {
      break;
    }
    if (stats.isSymbolicLink()) {
      throw new Error(`${label} must not use symlinks: ${relativePath}`);
    }
  }
}

/** Resolve a path for mutation after rejecting user-controlled symlink ancestors. */
export function resolveSymlinkFreePath(path: string, label: string): string {
  const absolutePath = normalizeDarwinRootAlias(resolve(path));
  const root = parse(absolutePath).root;
  let current = root;
  for (const segment of relative(root, absolutePath).split(/[\\/]/u).filter((part) => part.length > 0)) {
    current = join(current, segment);
    const stats = lstatIfPresent(current);
    if (stats === undefined) break;
    if (stats.isSymbolicLink()) throw new Error(`${label} must not use symlinks: ${path}`);
  }
  return absolutePath;
}

function normalizeDarwinRootAlias(path: string): string {
  if (process.platform !== "darwin") return path;
  for (const [alias, expectedTarget] of [["/var", "/private/var"], ["/tmp", "/private/tmp"]] as const) {
    if (path !== alias && !path.startsWith(`${alias}${sep}`)) continue;
    let actualTarget: string;
    try {
      actualTarget = realpathSync.native(alias);
    } catch {
      return path;
    }
    if (actualTarget !== expectedTarget) return path;
    return resolve(expectedTarget, relative(alias, path));
  }
  return path;
}

function lstatIfPresent(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}
