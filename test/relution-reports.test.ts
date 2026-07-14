import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import test from "node:test";
import type { RelutionAssessmentReport } from "../src/relution-api.js";
import { MAX_RETAINED_RELUTION_REPORTS, listRelutionReports, renderRelutionMarkdownReport, writeRelutionReport } from "../src/relution-reports.js";

test("Relution report writes use private workspace-relative paths independent of generatedAt", () => {
  const workspace = temporaryWorkspace();
  const files = writeRelutionReport(workspace, assessment("../../outside"));

  assert.equal(isAbsolute(files.jsonPath), false);
  assert.equal(isAbsolute(files.markdownPath), false);
  assert.match(files.jsonPath, /^reports\/relution-compliance-report-[0-9a-f-]+\.json$/u);
  assert.match(files.markdownPath, /^reports\/relution-compliance-report-[0-9a-f-]+\.md$/u);
  assert.equal(existsSync(join(workspace, files.jsonPath)), true);
  assert.equal(existsSync(join(workspace, files.markdownPath)), true);
  assert.equal(existsSync(join(workspace, "outside")), false);
  if (process.platform !== "win32") {
    assert.equal(lstatSync(join(workspace, files.jsonPath)).mode & 0o777, 0o600);
    assert.equal(lstatSync(join(workspace, files.markdownPath)).mode & 0o777, 0o600);
  }
  const persisted = readFileSync(join(workspace, files.jsonPath), "utf8");
  for (const secret of ["raw-secret", "SERIAL-123", "person@example.test", "Jane Device Owner", "relution.example.test"]) {
    assert.equal(persisted.includes(secret), false);
  }
  assert.deepEqual(readdirSync(join(workspace, "reports")).filter((name) => name.includes(".tmp")), []);
});

test("Relution reports reject symlinked report directories and report files", () => {
  const root = mkdtempSync(join(tmpdir(), "relution-reports-symlink-"));
  const workspace = join(root, "workspace");
  const outside = join(root, "outside");
  mkdirSync(workspace);
  mkdirSync(outside);
  symlinkSync(outside, join(workspace, "reports"));
  assert.throws(() => writeRelutionReport(workspace, assessment()), /real directory/u);

  const safeWorkspace = temporaryWorkspace();
  const files = writeRelutionReport(safeWorkspace, assessment());
  unlinkSync(join(safeWorkspace, files.jsonPath));
  symlinkSync(join(root, "outside-report.json"), join(safeWorkspace, files.jsonPath));
  assert.throws(() => listRelutionReports(safeWorkspace), /Unsafe Relution report path/u);
});

test("Relution report writes remain unique and retain only complete recent pairs", () => {
  const workspace = temporaryWorkspace();
  const files = Array.from({ length: MAX_RETAINED_RELUTION_REPORTS + 2 }, () => writeRelutionReport(workspace, assessment("same timestamp")));
  assert.equal(new Set(files.map((entry) => entry.jsonPath)).size, files.length);

  const history = listRelutionReports(workspace);
  assert.equal(history.length, MAX_RETAINED_RELUTION_REPORTS);
  assert.equal(history.every((entry) => entry.markdownPath !== undefined), true);

  const incompleteReport = join(workspace, "reports", "relution-compliance-report-00000000-0000-0000-0000-000000000000.json");
  writeFileSync(incompleteReport, "{}\n");
  assert.equal(listRelutionReports(workspace).length, MAX_RETAINED_RELUTION_REPORTS);
  assert.equal(existsSync(incompleteReport), true, "fresh in-progress files are not removed");
  const stale = new Date("2000-01-01T00:00:00.000Z");
  utimesSync(incompleteReport, stale, stale);
  assert.equal(listRelutionReports(workspace).length, MAX_RETAINED_RELUTION_REPORTS);
  assert.equal(existsSync(incompleteReport), false);
  writeRelutionReport(workspace, assessment());
  const historyWithIncompleteReport = listRelutionReports(workspace);
  assert.equal(historyWithIncompleteReport.length, MAX_RETAINED_RELUTION_REPORTS);
  assert.equal(historyWithIncompleteReport.some((entry) => entry.jsonPath.endsWith("00000000-0000-0000-0000-000000000000.json")), false);
  assert.deepEqual(readdirSync(join(workspace, "reports")).filter((name) => name.includes(".tmp")), []);
});

test("Relution report pruning never deletes the report being returned when mtimes tie", () => {
  const workspace = temporaryWorkspace();
  for (let index = 0; index < MAX_RETAINED_RELUTION_REPORTS; index += 1) {
    writeRelutionReport(workspace, assessment());
  }
  const future = new Date("2100-01-01T00:00:00.000Z");
  for (const name of readdirSync(join(workspace, "reports"))) {
    utimesSync(join(workspace, "reports", name), future, future);
  }

  const current = writeRelutionReport(workspace, assessment());
  assert.equal(existsSync(join(workspace, current.jsonPath)), true);
  assert.equal(existsSync(join(workspace, current.markdownPath)), true);
  assert.equal(listRelutionReports(workspace).length, MAX_RETAINED_RELUTION_REPORTS);
});

test("Relution reports persist explicit partial-query completeness metadata", () => {
  const workspace = temporaryWorkspace();
  const report = assessment();
  report.completeness = { assessedCount: 1_000, total: 2_001, truncated: true, status: "partial" };
  const files = writeRelutionReport(workspace, report);
  const persisted = JSON.parse(readFileSync(join(workspace, files.jsonPath), "utf8")) as RelutionAssessmentReport;

  assert.deepEqual(persisted.completeness, report.completeness);
  assert.match(readFileSync(join(workspace, files.markdownPath), "utf8"), /Assessed: 1000 of 2001/u);
  assert.match(renderRelutionMarkdownReport(report), /Coverage: partial/u);
});

test("Relution report history retains and prunes legacy timestamp-named report pairs", () => {
  const workspace = temporaryWorkspace();
  const reportDir = join(workspace, "reports");
  mkdirSync(reportDir);
  for (let day = 1; day <= MAX_RETAINED_RELUTION_REPORTS + 2; day += 1) {
    const dayText = String(day).padStart(2, "0");
    const stem = `relution-compliance-report-2026-07-${dayText}T12-00-00-000Z`;
    const modified = new Date(`2026-07-${dayText}T12:00:00.000Z`);
    for (const extension of ["json", "md"]) {
      const path = join(reportDir, `${stem}.${extension}`);
      writeFileSync(path, extension === "json" ? "{}\n" : "# Legacy\n");
      utimesSync(path, modified, modified);
    }
  }

  assert.equal(listRelutionReports(workspace).length, MAX_RETAINED_RELUTION_REPORTS + 2);
  writeRelutionReport(workspace, assessment());

  const history = listRelutionReports(workspace);
  assert.equal(history.length, MAX_RETAINED_RELUTION_REPORTS);
  assert.equal(history.filter((entry) => entry.jsonPath.includes("T12-00-00-000Z")).length, MAX_RETAINED_RELUTION_REPORTS - 1);
  assert.equal(readdirSync(reportDir).length, MAX_RETAINED_RELUTION_REPORTS * 2);
});

function temporaryWorkspace(): string {
  const workspace = join(mkdtempSync(join(tmpdir(), "relution-reports-")), "workspace");
  mkdirSync(workspace);
  return workspace;
}

function assessment(generatedAt = "2026-07-14T12:00:00.000Z"): RelutionAssessmentReport {
  return {
    generatedAt,
    baseUrl: "https://relution.example.test",
    completeness: { assessedCount: 0, truncated: false, status: "unknown" },
    summary: {
      totalDevices: 0,
      compliant: 0,
      issue: 0,
      notCheckable: 0,
      missingPolicy: 0,
      inactiveWarning: 0,
      inactiveProblem: 0,
      byPlatform: {},
      byStatus: {},
      byPolicyStatus: {},
    },
    devices: [{
      device: {
        name: "Campus iPad",
        serialNumber: "SERIAL-123",
        userName: "Jane Device Owner",
        userEmail: "person@example.test",
        raw: { token: "raw-secret" },
      },
      status: "compliant",
      issues: [],
    }],
  };
}
