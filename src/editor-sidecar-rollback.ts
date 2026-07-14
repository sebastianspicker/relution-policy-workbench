import { lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { saveWorkspace, type PolicyWorkspace } from "./workspace.js";
import { writePrivateFileAtomic } from "./utils/atomic-private-file.js";
import { assertNoSymlinkPath } from "./utils/path-safety.js";

export type SidecarPathState =
  | { kind: "missing" }
  | { kind: "directory" }
  | { kind: "file"; contents: string }
  | { kind: "symlink"; target: string };

export function captureSidecarState(workspaceDir: string): SidecarPathState {
  assertNoSymlinkPath(workspaceDir, "", "Workspace sidecar path");
  const path = join(workspaceDir, "editor-sidecar.json");
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (isMissingPathError(error)) return { kind: "missing" };
    throw error;
  }
  if (stat.isSymbolicLink()) {
    return { kind: "symlink", target: readlinkSync(path) };
  }
  if (stat.isDirectory()) {
    return { kind: "directory" };
  }
  if (!stat.isFile()) {
    throw new Error(`Unsupported editor sidecar path type: ${path}`);
  }
  return { kind: "file", contents: readFileSync(path, "utf8") };
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function restoreSidecarState(workspaceDir: string, snapshot: SidecarPathState): void {
  assertNoSymlinkPath(workspaceDir, "", "Workspace sidecar path");
  const path = join(workspaceDir, "editor-sidecar.json");
  rmSync(path, { recursive: true, force: true });

  if (snapshot.kind === "missing") {
    return;
  }
  if (snapshot.kind === "directory") {
    mkdirSync(path, { recursive: true, mode: 0o700 });
    return;
  }
  if (snapshot.kind === "symlink") {
    symlinkSync(snapshot.target, path);
    return;
  }
  writePrivateFileAtomic(path, Buffer.from(snapshot.contents), { force: false, label: "Workspace sidecar path" });
}

export function rollbackPersistedEditorState(
  workspaceDir: string,
  previousWorkspace: PolicyWorkspace,
  previousSidecar: SidecarPathState,
  originalError: unknown,
): void {
  const rollbackErrors: string[] = [];

  try {
    saveWorkspace(workspaceDir, previousWorkspace);
  } catch (error) {
    rollbackErrors.push(`workspace rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    restoreSidecarState(workspaceDir, previousSidecar);
  } catch (error) {
    rollbackErrors.push(`sidecar rollback failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (rollbackErrors.length > 0) {
    const originalMessage = originalError instanceof Error ? originalError.message : String(originalError);
    throw new Error(`${originalMessage}; ${rollbackErrors.join("; ")}`);
  }
}
