/** Builds verified editor archives without overwriting unsafe output paths. */
import { randomUUID } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { packPlainDirectory, verifyRexp, type PackOptions, type VerificationResult } from "./rexp.js";
import { isMissingPathError } from "./utils/filesystem.js";
import { resolveSymlinkFreePath } from "./utils/path-safety.js";

export interface VerifiedEditorArchiveOptions {
  readonly workspace: string;
  readonly output: string;
  readonly key: string;
  readonly pack?: (inputDir: string, outputFile: string, password: string, options: PackOptions) => void;
  readonly verify?: (filePath: string, password: string) => VerificationResult;
}

/**
 * Builds into a private sibling then only replaces the requested output after
 * verification. A pack or verification failure therefore leaves an earlier
 * usable archive untouched.
 */
export function buildVerifiedEditorArchive(options: VerifiedEditorArchiveOptions): VerificationResult {
  const output = resolveSymlinkFreePath(options.output, "Archive output path");
  assertOutputIsRegularOrAbsent(output);
  const parent = dirname(output);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const temporary = join(parent, `.${basename(output)}.${randomUUID()}.pending`);
  const pack = options.pack ?? packPlainDirectory;
  const verify = options.verify ?? verifyRexp;

  try {
    pack(options.workspace, temporary, options.key, { force: false });
    const stagedPath = resolveSymlinkFreePath(temporary, "Archive staging path");
    assertOutputIsRegularOrAbsent(stagedPath, "Archive staging path");
    const verification = verify(stagedPath, options.key);
    if (!verification.ok) return verification;

    // Revalidate immediately before publication: the destination must not
    // become a symlink after staging. rename(2) is atomic within this parent.
    const publishPath = resolveSymlinkFreePath(output, "Archive output path");
    assertOutputIsRegularOrAbsent(publishPath);
    const verifiedStage = resolveSymlinkFreePath(stagedPath, "Archive staging path");
    assertOutputIsRegularOrAbsent(verifiedStage, "Archive staging path");
    chmodSync(verifiedStage, 0o600);
    renameSync(verifiedStage, publishPath);
    return verification;
  } finally {
    rmSync(temporary, { force: true });
  }
}

function assertOutputIsRegularOrAbsent(path: string, label = "Archive output path"): void {
  try {
    if (!lstatSync(path).isFile()) {
      throw new Error(`${label} exists and is not a regular file: ${path}`);
    }
  } catch (error) {
    if (isMissingPathError(error)) return;
    throw error;
  }
}
