import { resolve } from "node:path";
import {
  applyRelutionDeviceQueryOptions,
  assessmentCompleteness,
  assessRelutionDevices,
  auditRelutionDevices,
  normalizeRelutionConnection,
  queryRelutionDevices,
  testRelutionConnection,
  type RelutionConnectionInput,
  type RelutionDeviceQueryResult,
  type RelutionDeviceQueryInput,
  type RelutionDeviceSortField,
  type RelutionProtocol,
} from "./relution-api.js";
import { writeRelutionReport } from "./relution-reports.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";

interface RelutionCliArgs {
  positionals: string[];
  options: Record<string, string | boolean>;
}

export async function runRelutionCliCommand(args: RelutionCliArgs, transportOptions: HttpServiceTransportOptions = {}): Promise<void> {
  const action = args.positionals[0];
  if (action === "test") {
    const result = await testRelutionConnection(connectionFromArgs(args), transportOptions);
    if (!result.ok) {
      throw new Error(`Relution API connection failed: ${result.reason}`);
    }
    printResult(args, result, `Relution API connection OK: ${result.baseUrl}`);
    return;
  }
  if (action === "devices") {
    const result = await queryRelutionDevices(connectionFromArgs(args), queryFromArgs(args), transportOptions);
    printResult(args, result, `Devices: ${String(result.count)}${result.total === undefined ? "" : ` of ${String(result.total)}`}`);
    return;
  }
  if (action === "assess") {
    const connection = connectionFromArgs(args);
    const devices = await queryRelutionDevices(connection, queryFromArgs(args), transportOptions);
    warnIfDeviceQueryIncomplete(devices);
    const report = assessRelutionDevices(connection.baseUrl, devices.devices, assessmentCompleteness(devices));
    const workspace = optionalString(args, "workspace");
    const output = workspace === undefined ? { report } : { report, files: writeRelutionReport(workspace, report) };
    if (args.options.json === true) {
      printJson(workspace !== undefined && "files" in output ? { report, files: absoluteReportPaths(workspace, output.files) } : output);
      return;
    }
    console.log(`Devices: ${String(report.summary.totalDevices)}`);
    console.log(`Compliant: ${String(report.summary.compliant)}`);
    console.log(`Issues: ${String(report.summary.issue)}`);
    console.log(`Not checkable: ${String(report.summary.notCheckable)}`);
    if (workspace !== undefined && "files" in output) {
      console.log(`Report JSON: ${resolve(workspace, output.files.jsonPath)}`);
      console.log(`Report Markdown: ${resolve(workspace, output.files.markdownPath)}`);
    }
    return;
  }
  if (action === "audit") {
    const connection = connectionFromArgs(args);
    const auditOptions: Parameters<typeof auditRelutionDevices>[2] = {};
    const expectedPoliciesByPlatform = expectedPoliciesFromArgs(args);
    const inactiveWarningDays = optionalInteger(args, "inactive-warning-days");
    const inactiveProblemDays = optionalInteger(args, "inactive-problem-days");
    if (expectedPoliciesByPlatform !== undefined) {
      auditOptions.expectedPoliciesByPlatform = expectedPoliciesByPlatform;
    }
    if (inactiveWarningDays !== undefined) {
      auditOptions.inactiveWarningDays = inactiveWarningDays;
    }
    if (inactiveProblemDays !== undefined) {
      auditOptions.inactiveProblemDays = inactiveProblemDays;
    }
    const output = await auditRelutionDevices(connection, queryFromArgs(args), auditOptions, transportOptions);
    warnIfDeviceQueryIncomplete(output.query);
    const workspace = optionalString(args, "workspace");
    const files = workspace === undefined ? undefined : writeRelutionReport(workspace, output.report);
    if (args.options.json === true) {
      printJson(files === undefined || workspace === undefined ? output : { ...output, files: absoluteReportPaths(workspace, files) });
      return;
    }
    console.log(`Devices: ${String(output.report.summary.totalDevices)}`);
    console.log(`Issues: ${String(output.report.summary.issue)}`);
    console.log(`Missing policy: ${String(output.report.summary.missingPolicy)}`);
    console.log(`Inactive ${String(inactiveWarningDays ?? 30)}+: ${String(output.report.summary.inactiveWarning)}`);
    console.log(`Inactive ${String(inactiveProblemDays ?? 90)}+: ${String(output.report.summary.inactiveProblem)}`);
    if (files !== undefined && workspace !== undefined) {
      console.log(`Report JSON: ${resolve(workspace, files.jsonPath)}`);
      console.log(`Report Markdown: ${resolve(workspace, files.markdownPath)}`);
    }
    return;
  }
  throw new Error("relution requires an action: test, devices, assess, or audit");
}

function absoluteReportPaths(workspace: string, files: { jsonPath: string; markdownPath: string }): { jsonPath: string; markdownPath: string } {
  return {
    jsonPath: resolve(workspace, files.jsonPath),
    markdownPath: resolve(workspace, files.markdownPath),
  };
}

function connectionFromArgs(args: RelutionCliArgs): ReturnType<typeof normalizeRelutionConnection> {
  const input: RelutionConnectionInput = {
    host: requireString(args, "host", "Missing --host <relution-host> or RELUTION_BASE_URL"),
    apiToken: requireString(args, "token", "Missing --token <api-token> or RELUTION_ACCESS_TOKEN"),
    allowLocalServiceHosts: args.options["allow-local-service-hosts"] === true,
  };
  const protocol = optionalProtocol(args);
  const port = optionalInteger(args, "port");
  const basePath = optionalString(args, "base-path");
  if (protocol !== undefined) {
    input.protocol = protocol;
  }
  if (port !== undefined) {
    input.port = port;
  }
  if (basePath !== undefined) {
    input.basePath = basePath;
  }
  return normalizeRelutionConnection(input);
}

function queryFromArgs(args: RelutionCliArgs): RelutionDeviceQueryInput {
  const query: RelutionDeviceQueryInput = {};
  const limit = optionalInteger(args, "limit");
  const offset = optionalInteger(args, "offset");
  const platforms = optionalCsv(args, "platform");
  const statuses = optionalCsv(args, "status");
  const ownerships = optionalCsv(args, "ownership");
  const search = optionalString(args, "search");
  const sortField = optionalSortField(args);
  const sortAscending = optionalBoolean(args, "sort-ascending");
  return applyRelutionDeviceQueryOptions(query, { limit, offset, platforms, statuses, ownerships, search, sortField, sortAscending });
}

function warnIfDeviceQueryIncomplete(result: RelutionDeviceQueryResult): void {
  if (result.total === undefined) {
    console.error(`Warning: assessed ${String(result.count)} enrolled devices, but the server did not report the total; compliance coverage is unknown.`);
    return;
  }
  if (!result.truncated) {
    return;
  }
  console.error(`Warning: showing ${String(result.count)} of ${String(result.total)} enrolled devices; compliance results are incomplete.`);
}

function optionalProtocol(args: RelutionCliArgs): RelutionProtocol | undefined {
  const protocol = optionalString(args, "protocol");
  if (protocol === undefined) {
    return undefined;
  }
  if (protocol !== "http" && protocol !== "https") {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
  return protocol;
}

function optionalSortField(args: RelutionCliArgs): RelutionDeviceSortField | undefined {
  const field = optionalString(args, "sort-field");
  if (field === undefined) {
    return undefined;
  }
  if (!["lastConnectionDate", "name", "platform", "status", "policyStatus"].includes(field)) {
    throw new Error(`Unsupported Relution device sort field: ${field}`);
  }
  return field as RelutionDeviceSortField;
}

function optionalCsv(args: RelutionCliArgs, name: string): string[] | undefined {
  const value = optionalString(args, name);
  if (value === undefined) {
    return undefined;
  }
  const entries = value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  return entries.length === 0 ? undefined : entries;
}

function expectedPoliciesFromArgs(args: RelutionCliArgs): Record<string, string[]> | undefined {
  const values = optionalCsv(args, "expected-policy");
  if (values === undefined) {
    return undefined;
  }
  const result: Record<string, string[]> = {};
  for (const value of values) {
    const [platform, policy] = value.split("=");
    if (platform === undefined || policy === undefined || platform.trim().length === 0 || policy.trim().length === 0) {
      throw new Error("Expected --expected-policy entries as Platform=Policy Name");
    }
    result[platform.trim()] = [...(result[platform.trim()] ?? []), policy.trim()];
  }
  return result;
}

function optionalBoolean(args: RelutionCliArgs, name: string): boolean | undefined {
  const value = args.options[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`Expected boolean for --${name}`);
}

function requireString(args: RelutionCliArgs, name: string, message: string): string {
  const value = optionalString(args, name) ?? envFallback(name);
  if (value === undefined || value.length === 0) {
    throw new Error(message);
  }
  return value;
}

function optionalString(args: RelutionCliArgs, name: string): string | undefined {
  const value = args.options[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalInteger(args: RelutionCliArgs, name: string): number | undefined {
  const value = optionalString(args, name);
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    throw new Error(`Expected non-negative integer for --${name}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Expected safe integer for --${name}`);
  }
  return parsed;
}

function envFallback(name: string): string | undefined {
  if (name === "host") {
    return process.env.RELUTION_BASE_URL;
  }
  if (name === "token") {
    return process.env.RELUTION_ACCESS_TOKEN;
  }
  return undefined;
}

function printResult(args: RelutionCliArgs, value: unknown, text: string): void {
  if (args.options.json === true) {
    printJson(value);
    return;
  }
  console.log(text);
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
