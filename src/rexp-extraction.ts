/** Materializes a fully validated REXP archive through an atomic workspace swap. */
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { assertNoSymlinkPath, resolveSymlinkFreePath } from "./utils/path-safety.js";
import { decryptRelutionPayload, formatJsonBuffer, parseJson } from "./rexp-crypto.js";
import { decryptHashMap, getRequiredEntry, policyEntries, validateArchiveJson } from "./rexp-archive-validation.js";
import { assertArchiveEntryHashes } from "./rexp-archive-hashes.js";
import { readRexpEntries } from "./rexp-archive-reader.js";
import { type ExtractOptions, HASHES_JSON, MANAGED_PROJECT_PATHS, METADATA_JSON, REPORT_JSON } from "./rexp-format.js";
import { listDirectoryNames, resolveManagedProjectPath, writeProjectFile } from "./rexp-project.js";
import type { ZipEntry } from "./zip.js";

export function extractRexp(filePath: string, outputDir: string, password: string, options: ExtractOptions = {}): void {
  const entries = readRexpEntries(filePath);
  const hashes = decryptHashMap(entries, password);
  assertArchiveEntryHashes(entries, hashes);
  validateArchiveJson(entries, password);
  replaceManagedProjectSurface(outputDir, materializeProject(entries, hashes, password, options.pretty), options.force === true);
}

function materializeProject(entries: ZipEntry[], hashes: Record<string, string>, password: string, pretty: boolean | undefined): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  files.set(METADATA_JSON, formattedOrOriginal(getRequiredEntry(entries, METADATA_JSON).data, METADATA_JSON, pretty));
  files.set(REPORT_JSON, formattedOrOriginal(getRequiredEntry(entries, REPORT_JSON).data, REPORT_JSON, pretty));
  files.set(HASHES_JSON, formatJsonBuffer(Buffer.from(JSON.stringify(hashes), "utf8"), HASHES_JSON));
  for (const entry of policyEntries(entries)) files.set(entry.name, formattedOrOriginal(decryptRelutionPayload(entry.data, password), entry.name, pretty));
  return files;
}

function formattedOrOriginal(data: Buffer, label: string, pretty: boolean | undefined): Buffer {
  parseJson(data, label);
  return pretty === true ? formatJsonBuffer(data, label) : data;
}

function replaceManagedProjectSurface(outputDir: string, files: Map<string, Buffer>, force: boolean): void {
  const output = resolveSymlinkFreePath(outputDir, "Output path");
  assertSafeExtractionDestination(output, force);
  mkdirSync(dirname(output), { recursive: true });
  const container = mkdtempSync(join(dirname(output), `.${basename(output)}.staging-`));
  chmodSync(container, 0o700);
  installStagedProject(container, output, files);
}

function installStagedProject(container: string, output: string, files: Map<string, Buffer>): void {
  const staging = join(container, "workspace"); const backup = join(container, "previous-workspace"); const hadOutput = existsSync(output); let cleanup = true;
  try {
    if (hadOutput) cpSync(output, staging, { recursive: true, dereference: false }); else mkdirSync(staging, { mode: 0o700 });
    chmodSync(staging, 0o700);
    for (const path of MANAGED_PROJECT_PATHS) rmSync(resolveManagedProjectPath(staging, path), { recursive: true, force: true });
    for (const [path, data] of files) writeProjectFile(staging, path, data);
    if (hadOutput) { renameSync(output, backup); cleanup = false; }
    try { renameSync(staging, output); cleanup = true; }
    catch (error) { restoreOriginal(output, backup, hadOutput, error); }
  } finally { if (cleanup) rmSync(container, { recursive: true, force: true }); }
}

function restoreOriginal(output: string, backup: string, hadOutput: boolean, error: unknown): never {
  if (!hadOutput) throw error;
  try { renameSync(backup, output); }
  catch (rollbackError) { throw new AggregateError([error, rollbackError], `Failed to install extracted workspace and restore the original; recover it from ${backup}`); }
  throw error;
}

function assertSafeExtractionDestination(output: string, force: boolean): void {
  assertNoSymlinkPath(output, "", "Output path");
  if (!existsSync(output)) return;
  if (!lstatSync(output).isDirectory()) throw new Error(`Output path exists and is not a directory: ${output}`);
  for (const path of MANAGED_PROJECT_PATHS) assertNoSymlinkPath(output, path, "Output path");
  const policies = join(output, "policies");
  if (existsSync(policies)) for (const name of listDirectoryNames(policies)) assertNoSymlinkPath(output, `policies/${name}`, "Output path");
  if (!force && listDirectoryNames(output).length > 0) throw new Error(`Output directory is not empty: ${output}`);
}
