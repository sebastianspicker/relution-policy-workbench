/** Identifies compliance reports that still match the active editing target. */
import type { ComplianceReport } from "../../../src/compliance.js";
import type { RecommendationSource } from "../../../src/recommendation-types.js";
import type { PolicyWorkspace } from "../../../src/workspace.js";
import type { Selection } from "./types.js";

export function complianceReportMatchesTarget(
  report: ComplianceReport | undefined,
  workspace: PolicyWorkspace,
  selection: Selection,
  sources: RecommendationSource[],
): report is ComplianceReport {
  if (report === undefined) return false;
  if (report.policyPath !== workspace.policies[selection.policyIndex]?.path) return false;
  if (report.versionIndex !== selection.versionIndex) return false;
  const reportSources = [...report.sources].sort();
  const selectedSources = [...sources].sort();
  return reportSources.length === selectedSources.length
    && reportSources.every((source, index) => source === selectedSources[index]);
}
