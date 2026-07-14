import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { resolveSymlinkFreePath } from "./path-safety.js";

export function writePrivateFileAtomic(
  outputPath: string,
  data: Buffer,
  options: { readonly force: boolean; readonly label: string },
): string {
  const resolvedOutput = resolveSymlinkFreePath(outputPath, options.label);
  const existing = lstatIfPresent(resolvedOutput);
  if (existing !== undefined && !existing.isFile()) {
    throw new Error(`${options.label} exists and is not a regular file: ${outputPath}`);
  }
  if (existing !== undefined && !options.force) {
    throw new Error(`${options.label} already exists: ${outputPath}`);
  }

  const parent = dirname(resolvedOutput);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const temporary = join(parent, `.${basename(resolvedOutput)}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  let linkedOutput = false;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, data);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (options.force) {
      renameSync(temporary, resolvedOutput);
    } else {
      linkSync(temporary, resolvedOutput);
      linkedOutput = true;
      unlinkSync(temporary);
    }
    return resolvedOutput;
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    const cleanupErrors: unknown[] = [error];
    if (linkedOutput) {
      try {
        unlinkSync(resolvedOutput);
      } catch (cleanupError) {
        if (!isMissingPath(cleanupError)) cleanupErrors.push(cleanupError);
      }
    }
    try {
      unlinkSync(temporary);
    } catch (cleanupError) {
      if (!isMissingPath(cleanupError)) cleanupErrors.push(cleanupError);
    }
    if (cleanupErrors.length > 1) throw new AggregateError(cleanupErrors, `Failed to write and clean up ${options.label}`);
    throw error;
  }
}

function lstatIfPresent(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if (isMissingPath(error)) return undefined;
    throw error;
  }
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
