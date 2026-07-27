/** Recovers or finalizes crash-interrupted workspace-surface replacement transactions. */
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { decodeStrictUtf8 } from "./strict-utf8.js";
import { readBoundedRegularFileNoFollow } from "./utils/bounded-file-read.js";
import { assertNoSymlinkPath } from "./utils/path-safety.js";

const ENTRIES = ["metadata.json", "report.json", "policies"] as const;
type ManagedEntry = typeof ENTRIES[number];
type Phase = "staged" | "backing-up" | "backed-up" | "installing" | "installed";

interface WorkspaceTransaction { workspaceDir: string; stageDir: string; backupDir: string; phase: Phase; movedToBackup: ManagedEntry[]; movedFromStage: ManagedEntry[]; }

export function createWorkspaceTransaction(workspaceDir: string, stageDir: string, backupDir: string): WorkspaceTransaction {
  return { workspaceDir: resolve(workspaceDir), stageDir, backupDir, phase: "staged", movedToBackup: [], movedFromStage: [] };
}

export function replaceWorkspaceSurface(transaction: WorkspaceTransaction): void {
  writeTransaction(transaction);
  transaction.phase = "backing-up";
  writeTransaction(transaction);
  moveAll(transaction, transaction.workspaceDir, transaction.backupDir, transaction.movedToBackup);
  transaction.phase = "backed-up";
  writeTransaction(transaction);
  transaction.phase = "installing";
  writeTransaction(transaction);
  moveAll(transaction, transaction.stageDir, transaction.workspaceDir, transaction.movedFromStage);
  transaction.phase = "installed";
  writeTransaction(transaction);
  finalizeTransaction(transaction);
}

export function recoverWorkspaceTransaction(workspaceDir: string): void {
  const journal = journalPath(workspaceDir);
  if (!existsSync(journal)) return;
  const transaction = parseTransaction(journal, workspaceDir);
  if (isCompleteInstall(transaction)) finalizeTransaction(transaction);
  else rollbackTransaction(transaction);
}

function moveAll(transaction: WorkspaceTransaction, from: string, to: string, moved: ManagedEntry[]): void {
  for (const entry of ENTRIES) {
    if (!moveEntry(from, to, entry)) continue;
    moved.push(entry);
    writeTransaction(transaction);
  }
}

function moveEntry(from: string, to: string, entry: ManagedEntry): boolean {
  const source = join(from, entry);
  if (!existsSync(source)) return false;
  assertNoSymlinkPath(from, entry, "Workspace transaction path");
  mkdirSync(dirname(join(to, entry)), { recursive: true, mode: 0o700 });
  renameSync(source, join(to, entry));
  syncDirectory(dirname(source));
  syncDirectory(dirname(join(to, entry)));
  return true;
}

function isCompleteInstall(transaction: WorkspaceTransaction): boolean {
  if (transaction.phase !== "installed" && transaction.phase !== "installing") return false;
  return ENTRIES.every((entry) => existsSync(join(transaction.workspaceDir, entry)));
}

function rollbackTransaction(transaction: WorkspaceTransaction): void {
  for (const entry of [...transaction.movedFromStage].reverse()) rmSync(join(transaction.workspaceDir, entry), { recursive: entry === "policies", force: true });
  for (const entry of [...transaction.movedToBackup].reverse()) moveEntry(transaction.backupDir, transaction.workspaceDir, entry);
  removeTransactionResidue(transaction);
}

function finalizeTransaction(transaction: WorkspaceTransaction): void { removeTransactionResidue(transaction); }

function removeTransactionResidue(transaction: WorkspaceTransaction): void {
  rmSync(transaction.stageDir, { recursive: true, force: true });
  rmSync(transaction.backupDir, { recursive: true, force: true });
  const journal = journalPath(transaction.workspaceDir);
  if (existsSync(journal)) unlinkSync(journal);
  syncDirectory(dirname(journal));
}

function writeTransaction(transaction: WorkspaceTransaction): void {
  const journal = journalPath(transaction.workspaceDir);
  const temporary = `${journal}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(transaction)}\n`, { mode: 0o600 });
  syncFile(temporary);
  renameSync(temporary, journal);
  syncDirectory(dirname(journal));
}

function parseTransaction(journal: string, workspaceDir: string): WorkspaceTransaction {
  const text = decodeStrictUtf8(readBoundedRegularFileNoFollow(journal, { label: "Workspace transaction journal", maxBytes: 64 * 1024 }), "workspace transaction journal");
  let parsed: unknown;
  try { parsed = JSON.parse(text) as unknown; } catch (error) { throw new Error(`Workspace transaction journal is invalid: ${error instanceof Error ? error.message : String(error)}`); }
  if (!isTransaction(parsed, workspaceDir)) throw new Error("Workspace transaction journal is invalid");
  return parsed;
}

function isTransaction(value: unknown, workspaceDir: string): value is WorkspaceTransaction {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const transaction = value as Partial<WorkspaceTransaction>;
  const expectedRoot = resolve(workspaceDir);
  return transaction.workspaceDir === expectedRoot && isSiblingTemp(transaction.stageDir, expectedRoot) && isSiblingTemp(transaction.backupDir, expectedRoot)
    && ["staged", "backing-up", "backed-up", "installing", "installed"].includes(transaction.phase ?? "")
    && Array.isArray(transaction.movedToBackup) && Array.isArray(transaction.movedFromStage)
    && transaction.movedToBackup.every(isEntry) && transaction.movedFromStage.every(isEntry);
}

function isSiblingTemp(value: unknown, workspaceDir: string): value is string {
  return typeof value === "string" && dirname(value) === dirname(workspaceDir) && basename(value).startsWith(`${basename(workspaceDir)}-`);
}

function isEntry(value: unknown): value is ManagedEntry { return typeof value === "string" && (ENTRIES as readonly string[]).includes(value); }
function journalPath(workspaceDir: string): string { const root = resolve(workspaceDir); return join(dirname(root), `.${basename(root)}-workspace-transaction.json`); }
function syncFile(path: string): void { const descriptor = openSync(path, "r"); try { fsyncSync(descriptor); } finally { closeSync(descriptor); } }
function syncDirectory(path: string): void { const descriptor = openSync(path, "r"); try { fsyncSync(descriptor); } finally { closeSync(descriptor); } }
