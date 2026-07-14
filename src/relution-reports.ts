import { chmodSync, closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, join, relative } from "node:path";
import type { RelutionAssessmentReport } from "./relution-api.js";

/** Keep only this many complete local report pairs to limit retained device-audit data. */
export const MAX_RETAINED_RELUTION_REPORTS = 10;
const STALE_INCOMPLETE_REPORT_MS = 5 * 60 * 1_000;
const RELUTION_REPORT_FILE_NAME = /^relution-compliance-report-(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.(json|md)$/u;

export interface RelutionReportPaths {
  /** Path relative to the workspace root. */
  jsonPath: string;
  /** Path relative to the workspace root. */
  markdownPath: string;
}

export interface RelutionReportHistoryEntry {
  jsonPath: string;
  markdownPath?: string;
  generatedAt?: string;
  sizeBytes: number;
}

export function writeRelutionReport(workspace: string, report: RelutionAssessmentReport): RelutionReportPaths {
  const { workspaceRoot, reportDir } = secureRelutionReportDir(workspace);
  if (reportDir === undefined) {
    throw new Error("Relution report directory is unavailable");
  }
  const reportId = randomUUID();
  const jsonName = `relution-compliance-report-${reportId}.json`;
  const markdownName = `relution-compliance-report-${reportId}.md`;
  const jsonFile = join(reportDir, jsonName);
  const markdownFile = join(reportDir, markdownName);
  let jsonTemporary: string | undefined;
  let markdownTemporary: string | undefined;
  try {
    jsonTemporary = writePrivateTemporaryFile(reportDir, jsonName, `${JSON.stringify(persistedRelutionReport(report), null, 2)}\n`);
    markdownTemporary = writePrivateTemporaryFile(reportDir, markdownName, renderRelutionMarkdownReport(report));
    renameSync(markdownTemporary, markdownFile);
    markdownTemporary = undefined;
    renameSync(jsonTemporary, jsonFile);
    jsonTemporary = undefined;
    pruneRelutionReportHistory(workspaceRoot, reportDir, jsonName);
  } catch (error) {
    if (jsonTemporary !== undefined) removeReportFile(jsonTemporary);
    if (markdownTemporary !== undefined) removeReportFile(markdownTemporary);
    removeReportFile(jsonFile);
    removeReportFile(markdownFile);
    throw error;
  }
  return {
    jsonPath: workspaceRelativeReportPath(workspaceRoot, jsonFile),
    markdownPath: workspaceRelativeReportPath(workspaceRoot, markdownFile),
  };
}

export function listRelutionReports(workspace: string): RelutionReportHistoryEntry[] {
  const { workspaceRoot, reportDir } = secureRelutionReportDir(workspace, false);
  if (reportDir === undefined) {
    return [];
  }
  removeIncompleteReportPairs(reportDir);
  return readdirSync(reportDir)
    .filter((name) => isRelutionReportFile(name, "json"))
    .map((name) => reportHistoryEntry(workspaceRoot, reportDir, name))
    .filter((entry) => entry.markdownPath !== undefined)
    .sort((a, b) => (b.generatedAt ?? "").localeCompare(a.generatedAt ?? ""));
}

export function renderRelutionMarkdownReport(report: RelutionAssessmentReport): string {
  const lines = [
    "# Relution Compliance Report",
    "",
    `Generated: ${report.generatedAt}`,
    "Server: [redacted]",
    "",
    "## Summary",
    "",
    `- Devices: ${String(report.summary.totalDevices)}`,
    `- Assessed: ${String(report.completeness.assessedCount)}${report.completeness.total === undefined ? "" : ` of ${String(report.completeness.total)}`}`,
    `- Coverage: ${report.completeness.status}`,
    `- Compliant: ${String(report.summary.compliant)}`,
    `- Issues: ${String(report.summary.issue)}`,
    `- Not checkable: ${String(report.summary.notCheckable)}`,
    "",
    "## Device Findings",
    "",
  ];
  for (const entry of report.devices) {
    lines.push(`### ${markdownText(entry.device.name)}`, "");
    lines.push(`- Status: ${entry.status}`);
    lines.push(`- Platform: ${markdownText(entry.device.platform ?? "unknown")}`);
    lines.push(`- Device status: ${markdownText(entry.device.status ?? "unknown")}`);
    lines.push(`- Policy status: ${markdownText(entry.device.policyStatus ?? "unknown")}`);
    if (entry.issues.length === 0) {
      lines.push("- Issues: none");
    } else {
      for (const issue of entry.issues) {
        lines.push(`- ${issue.id}: ${issue.severity}: ${markdownText(issue.message)}`);
      }
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function secureRelutionReportDir(workspace: string, create = true): { workspaceRoot: string; reportDir: string | undefined } {
  const workspaceRoot = realpathSync(workspace);
  const reportDir = join(workspaceRoot, "reports");
  try {
    const reportStats = lstatSync(reportDir);
    if (reportStats.isSymbolicLink() || !reportStats.isDirectory()) {
      throw new Error("Relution report directory must be a real directory inside the workspace");
    }
  } catch (error) {
    if (isMissingPath(error)) {
      if (!create) return { workspaceRoot, reportDir: undefined };
      mkdirSync(reportDir, { recursive: true, mode: 0o700 });
    } else {
      throw error;
    }
  }
  const resolvedReportDir = realpathSync(reportDir);
  if (relative(workspaceRoot, resolvedReportDir) !== "reports") {
    throw new Error("Relution report directory escaped the workspace");
  }
  chmodSync(resolvedReportDir, 0o700);
  return { workspaceRoot, reportDir: resolvedReportDir };
}

function reportHistoryEntry(workspaceRoot: string, reportDir: string, jsonName: string): RelutionReportHistoryEntry {
  const jsonFile = reportFile(reportDir, jsonName);
  const jsonStats = lstatSync(jsonFile);
  if (jsonStats.isSymbolicLink() || !jsonStats.isFile()) {
    throw new Error(`Unsafe Relution report path: ${jsonName}`);
  }
  const markdownName = jsonName.replace(/\.json$/u, ".md");
  const markdownFile = reportFile(reportDir, markdownName);
  const entry: RelutionReportHistoryEntry = {
    jsonPath: workspaceRelativeReportPath(workspaceRoot, jsonFile),
    sizeBytes: jsonStats.size,
    generatedAt: jsonStats.mtime.toISOString(),
  };
  const markdownStats = lstatIfPresent(markdownFile);
  if (markdownStats !== undefined) {
    if (markdownStats.isSymbolicLink() || !markdownStats.isFile()) {
      throw new Error(`Unsafe Relution report path: ${markdownName}`);
    }
    entry.markdownPath = workspaceRelativeReportPath(workspaceRoot, markdownFile);
  }
  return entry;
}

function persistedRelutionReport(report: RelutionAssessmentReport): Omit<RelutionAssessmentReport, "devices"> & { devices: Array<Omit<RelutionAssessmentReport["devices"][number], "device"> & { device: Omit<RelutionAssessmentReport["devices"][number]["device"], "raw" | "serialNumber" | "userName" | "userEmail"> }> } {
  return {
    ...report,
    baseUrl: "[redacted]",
    devices: report.devices.map(({ device, ...assessment }) => {
      const { raw: _raw, serialNumber: _serialNumber, userName: _userName, userEmail: _userEmail, ...persistedDevice } = device;
      return { ...assessment, device: persistedDevice };
    }),
  };
}

function pruneRelutionReportHistory(workspaceRoot: string, reportDir: string, protectedJsonName: string): void {
  removeIncompleteReportPairs(reportDir);
  const completeReports = listRelutionReports(workspaceRoot);
  const protectedExists = completeReports.some((entry) => basename(entry.jsonPath) === protectedJsonName);
  const retainedOtherCount = MAX_RETAINED_RELUTION_REPORTS - (protectedExists ? 1 : 0);
  const removable = completeReports.filter((entry) => basename(entry.jsonPath) !== protectedJsonName);
  for (const entry of removable.slice(retainedOtherCount)) {
    removeReportFile(reportFile(reportDir, basename(entry.jsonPath)));
    removeReportFile(reportFile(reportDir, basename(entry.markdownPath ?? "")));
  }
}

function removeIncompleteReportPairs(reportDir: string): void {
  const names = readdirSync(reportDir);
  const nameSet = new Set(names);
  for (const name of names) {
    const path = reportFile(reportDir, name);
    if (/^\.relution-compliance-report-[0-9a-f-]+\.(?:json|md)\.[0-9a-f-]+\.tmp$/u.test(name)) {
      removeStaleIncompleteFile(path, name);
      continue;
    }
    const isJson = isRelutionReportFile(name, "json");
    const isMarkdown = isRelutionReportFile(name, "md");
    if (!isJson && !isMarkdown) continue;
    const companion = isJson ? name.replace(/\.json$/u, ".md") : name.replace(/\.md$/u, ".json");
    if (nameSet.has(companion)) continue;
    removeStaleIncompleteFile(path, name);
  }
}

function isRelutionReportFile(name: string, extension: "json" | "md"): boolean {
  return RELUTION_REPORT_FILE_NAME.exec(name)?.[1] === extension;
}

function markdownText(value: string): string {
  return value.replace(/[\r\n]+/gu, " ").replace(/[\\`*_{}[\]<>()#+.!|>-]/gu, "\\$&");
}

function writePrivateTemporaryFile(reportDir: string, name: string, contents: string): string {
  const temporary = reportFile(reportDir, `.${name}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, contents, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    return temporary;
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    removeReportFile(temporary);
    throw error;
  }
}

function removeStaleIncompleteFile(path: string, name: string): void {
  const stats = lstatSync(path);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`Unsafe Relution report path: ${name}`);
  }
  if (Date.now() - stats.mtimeMs >= STALE_INCOMPLETE_REPORT_MS) {
    removeReportFile(path);
  }
}

function reportFile(reportDir: string, name: string): string {
  const path = join(reportDir, name);
  if (relative(reportDir, path) !== name) {
    throw new Error("Relution report path escaped the report directory");
  }
  return path;
}

function workspaceRelativeReportPath(workspaceRoot: string, reportPath: string): string {
  const reportRelativePath = relative(workspaceRoot, reportPath);
  if (reportRelativePath.length === 0 || reportRelativePath.startsWith("..") || reportRelativePath === "reports") {
    throw new Error("Relution report path escaped the workspace");
  }
  return reportRelativePath;
}

function removeReportFile(path: string): void {
  try {
    unlinkSync(path);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
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
