// Supports Relution Docker end-to-end test scenarios and helpers.
import type { PolicyImportReport, PolicyImportReportEntry } from "./relution-docker-e2e-types.js";

export function firstImportedPolicyUuid(report: PolicyImportReport): string {
  return requiredImportedPolicyUuid(
    report,
    (entry) => entry.policyUuid !== undefined,
    "an imported policy UUID",
  );
}

export function importedPolicyUuidByName(
  report: PolicyImportReport,
  policyName: string,
): string {
  return requiredImportedPolicyUuid(
    report,
    (entry) => entry.policyName === policyName && entry.policyUuid !== undefined,
    `imported policy ${policyName}`,
  );
}

function requiredImportedPolicyUuid(
  report: PolicyImportReport,
  predicate: (entry: PolicyImportReportEntry) => boolean,
  description: string,
): string {
  const policyUuid = Object.values(report.importedPolicies ?? {}).find(predicate)?.policyUuid;
  if (policyUuid === undefined) {
    throw new Error(`Import report did not contain ${description}: ${JSON.stringify(report)}`);
  }
  return policyUuid;
}
