/** Wraps the Relution service API with validated request and response contracts. */
import { HttpConnectionInputError, normalizeHttpConnectionInput } from "./connection-normalization.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { fetchServiceApi } from "./service-api-request.js";
import { strictResponseJson } from "./strict-response-json.js";
import { asRecord } from "./utils/json-guards.js";

export type RelutionProtocol = "http" | "https";

export interface RelutionConnectionInput {
  protocol?: RelutionProtocol;
  host: string;
  port?: number;
  basePath?: string;
  apiToken: string;
  allowLocalServiceHosts?: boolean;
}

export interface RelutionConnection {
  protocol: RelutionProtocol;
  host: string;
  port?: number;
  basePath: string;
  apiToken: string;
  baseUrl: string;
  allowLocalServiceHosts: boolean;
  mode: "read-only";
}

export interface RelutionPublicSession {
  configured: boolean;
  baseUrl?: string;
  tokenConfigured: boolean;
  mode: "read-only";
}

class RelutionNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RelutionNetworkError";
  }
}

export interface RelutionDeviceQueryInput {
  limit?: number;
  offset?: number;
  platforms?: string[];
  statuses?: string[];
  ownerships?: string[];
  search?: string;
  sortField?: RelutionDeviceSortField;
  sortAscending?: boolean;
}

export type RelutionDeviceQueryOptions = {
  [Key in keyof RelutionDeviceQueryInput]?: RelutionDeviceQueryInput[Key] | undefined;
};

export function applyRelutionDeviceQueryOptions(
  query: RelutionDeviceQueryInput,
  options: RelutionDeviceQueryOptions,
): RelutionDeviceQueryInput {
  for (const [key, value] of Object.entries(options) as Array<[keyof RelutionDeviceQueryInput, RelutionDeviceQueryInput[keyof RelutionDeviceQueryInput]]>) {
    if (value !== undefined) {
      Object.assign(query, { [key]: value });
    }
  }
  return query;
}

export type RelutionDeviceSortField = "lastConnectionDate" | "name" | "platform" | "status" | "policyStatus";

const RELUTION_DEVICE_SORT_FIELDS: readonly RelutionDeviceSortField[] = [
  "lastConnectionDate",
  "name",
  "platform",
  "status",
  "policyStatus",
];

function isRelutionDeviceSortField(value: string): value is RelutionDeviceSortField {
  return RELUTION_DEVICE_SORT_FIELDS.includes(value as RelutionDeviceSortField);
}

export function requireRelutionDeviceSortField(value: string, invalid: Error): RelutionDeviceSortField {
  if (!isRelutionDeviceSortField(value)) throw invalid;
  return value;
}

export function optionalRelutionDeviceSortField(
  value: string | undefined,
  invalid: (value: string) => Error,
): RelutionDeviceSortField | undefined {
  return value === undefined ? undefined : requireRelutionDeviceSortField(value, invalid(value));
}

export function unsupportedRelutionDeviceSortFieldMessage(value: string): string {
  return `Unsupported Relution device sort field: ${value}`;
}
export const MAX_RELUTION_DEVICE_QUERY_LIMIT = 1_000;

export interface RelutionDeviceQueryResult {
  baseUrl: string;
  count: number;
  total?: number;
  truncated: boolean;
  devices: RelutionDeviceSummary[];
}

export interface RelutionDeviceSummary {
  uuid?: string;
  name: string;
  platform?: string;
  status?: string;
  policyStatus?: string;
  lastConnectionDate?: string;
  inactiveDays?: number;
  ownership?: string;
  serialNumber?: string;
  userName?: string;
  userEmail?: string;
  assignedPolicies?: string[];
  raw: Record<string, unknown>;
}

type RelutionAssessmentIssueId =
  | "device-identity-missing"
  | "device-status-missing"
  | "device-status-noncompliant"
  | "policy-status-missing"
  | "policy-status-not-applied"
  | "missing-policy"
  | "policy-assignment-unknown"
  | "inactive-warning"
  | "inactive-problem";

export interface RelutionAssessmentIssue {
  id: RelutionAssessmentIssueId;
  severity: "warning" | "problem" | "unknown";
  message: string;
  evidence: Record<string, string>;
}

export interface RelutionDeviceAssessment {
  device: RelutionDeviceSummary;
  status: "compliant" | "issue" | "not-checkable";
  issues: RelutionAssessmentIssue[];
}

export interface RelutionAssessmentReport {
  generatedAt: string;
  baseUrl: string;
  completeness: RelutionAssessmentCompleteness;
  summary: {
    totalDevices: number;
    compliant: number;
    issue: number;
    notCheckable: number;
    missingPolicy: number;
    inactiveWarning: number;
    inactiveProblem: number;
    byPlatform: Record<string, number>;
    byStatus: Record<string, number>;
    byPolicyStatus: Record<string, number>;
  };
  devices: RelutionDeviceAssessment[];
}

/** Records whether the returned page covers the server-reported total matching devices. */
export interface RelutionAssessmentCompleteness {
  assessedCount: number;
  total?: number;
  truncated: boolean;
  status: "complete" | "partial" | "unknown";
}

export interface RelutionAssessmentOptions {
  expectedPoliciesByPlatform?: Record<string, string[]>;
  inactiveWarningDays?: number;
  inactiveProblemDays?: number;
  now?: Date;
}

interface RelutionQueryResponse {
  results: unknown[];
  total?: number;
  nonpagedCount?: number;
}

export type RelutionConnectionTestResult =
  | { ok: true; baseUrl: string }
  | { ok: false; baseUrl: string; reason: string };

export function normalizeRelutionConnection(input: RelutionConnectionInput): RelutionConnection {
  const apiToken = input.apiToken.trim();
  if (apiToken.length === 0) {
    throw new HttpConnectionInputError("Relution API token is required");
  }
  const connection = normalizeHttpConnectionInput({ ...input, serviceName: "Relution" });
  if (connection.protocol === "http" && !connection.allowLocalServiceHosts) {
    throw new HttpConnectionInputError("Relution HTTP connections require --allow-local-service-hosts; use HTTPS for remote services");
  }
  return {
    ...connection,
    apiToken,
    mode: "read-only",
  };
}

export function publicRelutionSession(connection: RelutionConnection | undefined): RelutionPublicSession {
  if (connection === undefined) {
    return { configured: false, tokenConfigured: false, mode: "read-only" };
  }
  return { configured: true, baseUrl: connection.baseUrl, tokenConfigured: connection.apiToken.length > 0, mode: "read-only" };
}

export async function testRelutionConnection(connection: RelutionConnection, transportOptions: HttpServiceTransportOptions = {}): Promise<RelutionConnectionTestResult> {
  const response = await relutionFetch(connection, "/api/v2/devices/baseInfo/query", {
    method: "POST",
    body: JSON.stringify(buildDeviceQueryBody({ limit: 1 })),
  }, transportOptions);
  try {
    relutionQueryResponse(await strictResponseJson(response, "Relution connection test"));
  } catch {
    return {
      ok: false,
      baseUrl: connection.baseUrl,
      reason: "Relution connection test returned an unexpected device query response.",
    };
  }
  return { ok: true, baseUrl: connection.baseUrl };
}

export async function queryRelutionDevices(
  connection: RelutionConnection,
  input: RelutionDeviceQueryInput,
  transportOptions: HttpServiceTransportOptions = {},
): Promise<RelutionDeviceQueryResult> {
  const limit = effectiveDeviceQueryLimit(input);
  const response = await relutionFetch(connection, "/api/v2/devices/baseInfo/query", {
    method: "POST",
    body: JSON.stringify(buildDeviceQueryBody(input)),
  }, transportOptions);
  const body = relutionQueryResponse(await strictResponseJson(response, "Relution device query"));
  if (body.results.length > limit) {
    throw new Error("Malformed Relution device query response: returned device count exceeds the requested limit.");
  }
  const devices = body.results.map(normalizeRelutionDeviceSummary);
  const total = relutionResultTotal(body);
  if (total !== undefined && total < devices.length) {
    throw new Error("Malformed Relution device query response: total is smaller than the returned device count.");
  }
  return {
    baseUrl: connection.baseUrl,
    count: devices.length,
    ...(total === undefined ? {} : { total }),
    truncated: total !== undefined && devices.length < total,
    devices,
  };
}

function relutionResultTotal(body: RelutionQueryResponse): number | undefined {
  return typeof body.nonpagedCount === "number" ? body.nonpagedCount : body.total;
}

function relutionQueryResponse(value: unknown): RelutionQueryResponse {
  const body = asRecord(value);
  if (body === undefined || !Array.isArray(body.results)) {
    throw new Error("Malformed Relution device query response: expected results array.");
  }
  if (body.results.some((result) => asRecord(result) === undefined)) {
    throw new Error("Malformed Relution device query response: each result must be an object.");
  }
  const nonpagedCount = optionalDeviceCount(body.nonpagedCount, "nonpagedCount");
  const total = optionalDeviceCount(body.total, "total");
  return {
    results: body.results,
    ...(nonpagedCount === undefined ? {} : { nonpagedCount }),
    ...(total === undefined ? {} : { total }),
  };
}

function optionalDeviceCount(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Malformed Relution device query response: ${field} must be a non-negative safe integer.`);
  }
  return value;
}

export function assessRelutionDevices(
  baseUrl: string,
  devices: RelutionDeviceSummary[],
  completeness: RelutionAssessmentCompleteness = assessmentCompleteness({ count: devices.length, truncated: false }),
): RelutionAssessmentReport {
  return createRelutionAssessmentReport(baseUrl, devices, {}, completeness);
}

export async function auditRelutionDevices(
  connection: RelutionConnection,
  query: RelutionDeviceQueryInput,
  options: RelutionAssessmentOptions = {},
  transportOptions: HttpServiceTransportOptions = {},
): Promise<{ query: RelutionDeviceQueryResult; report: RelutionAssessmentReport }> {
  validateRelutionAssessmentOptions(options);
  const result = await queryRelutionDevices(connection, query, transportOptions);
  return { query: result, report: createRelutionAssessmentReport(connection.baseUrl, result.devices, options, assessmentCompleteness(result)) };
}

export function createRelutionAssessmentReport(
  baseUrl: string,
  devices: RelutionDeviceSummary[],
  options: RelutionAssessmentOptions = {},
  completeness: RelutionAssessmentCompleteness = assessmentCompleteness({ count: devices.length, truncated: false }),
): RelutionAssessmentReport {
  const normalizedOptions = normalizeAssessmentOptions(options);
  const assessments = devices.map((device) => assessDevice(device, normalizedOptions));
  const summary = {
    totalDevices: assessments.length,
    compliant: assessments.filter((entry) => entry.status === "compliant").length,
    issue: assessments.filter((entry) => entry.status === "issue").length,
    notCheckable: assessments.filter((entry) => entry.status === "not-checkable").length,
    missingPolicy: assessments.filter((entry) => entry.issues.some((issue) => issue.id === "missing-policy")).length,
    inactiveWarning: assessments.filter((entry) => entry.issues.some((issue) => issue.id === "inactive-warning" || issue.id === "inactive-problem")).length,
    inactiveProblem: assessments.filter((entry) => entry.issues.some((issue) => issue.id === "inactive-problem")).length,
    byPlatform: countBy(devices.map((device) => device.platform ?? "UNKNOWN")),
    byStatus: countBy(devices.map((device) => device.status ?? "UNKNOWN")),
    byPolicyStatus: countBy(devices.map((device) => device.policyStatus ?? "UNKNOWN")),
  };
  return { generatedAt: new Date().toISOString(), baseUrl, completeness, summary, devices: assessments };
}

export function assessmentCompleteness(query: Pick<RelutionDeviceQueryResult, "count" | "total" | "truncated">): RelutionAssessmentCompleteness {
  return {
    assessedCount: query.count,
    ...(query.total === undefined ? {} : { total: query.total }),
    truncated: query.truncated,
    status: query.total === undefined ? "unknown" : query.truncated ? "partial" : "complete",
  };
}

function buildDeviceQueryBody(input: RelutionDeviceQueryInput): Record<string, unknown> {
  const limit = effectiveDeviceQueryLimit(input);
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Relution device query offset must be a non-negative safe integer");
  }
  const filters = deviceQueryFilters(input);
  return {
    limit,
    offset,
    getNonpagedCount: true,
    sortOrder: { sortFields: [{ name: input.sortField ?? "lastConnectionDate", ascending: input.sortAscending ?? false }] },
    ...(filters.length === 0 ? {} : { filter: { type: "logOp", operation: "AND", filters } }),
  };
}

function effectiveDeviceQueryLimit(input: RelutionDeviceQueryInput): number {
  const limit = input.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > MAX_RELUTION_DEVICE_QUERY_LIMIT) {
    throw new Error(`Relution device query limit must be an integer between 0 and ${String(MAX_RELUTION_DEVICE_QUERY_LIMIT)}`);
  }
  return limit;
}

function deviceQueryFilters(input: RelutionDeviceQueryInput): Array<Record<string, unknown>> {
  return [
    ...stringEnumFilter("platform", input.platforms),
    ...stringEnumFilter("status", input.statuses),
    ...stringEnumFilter("ownership", input.ownerships),
    ...searchFilter(input.search),
  ];
}

function stringEnumFilter(fieldName: string, values: string[] | undefined): Array<Record<string, unknown>> {
  return values === undefined || values.length === 0 ? [] : [{ type: "stringEnum", fieldName, values }];
}

function searchFilter(search: string | undefined): Array<Record<string, unknown>> {
  const value = search?.trim();
  return value === undefined || value.length === 0 ? [] : [{ type: "string", fieldName: "name", value, comparator: "CONTAINS" }];
}

async function relutionFetch(connection: RelutionConnection, path: string, init: RequestInit, transportOptions: HttpServiceTransportOptions): Promise<Response> {
  assertRelutionReadOnlyRequest(init.method, path);
  return await fetchServiceApi({
    connection,
    serviceName: "Relution",
    path,
    init,
    transportOptions,
    serviceHeaders: {
      "accept": "application/json",
      "accept-charset": "UTF-8",
      "content-type": "application/json",
      "X-User-Access-Token": connection.apiToken,
    },
    createNetworkError: (message, cause) => new RelutionNetworkError(message, { cause }),
  });
}

export function assertRelutionReadOnlyRequest(method: string | undefined, path: string): void {
  const normalizedMethod = (method ?? "GET").toUpperCase();
  // Relution exposes device search as POST, but this endpoint only reads base
  // device information. Do not add mutating endpoints here for production use.
  if (normalizedMethod === "POST" && path === "/api/v2/devices/baseInfo/query") {
    return;
  }
  throw new Error(`Blocked non-read-only Relution API request: ${normalizedMethod} ${path}`);
}

export function normalizeRelutionDeviceSummary(value: unknown): RelutionDeviceSummary {
  const raw = asRecord(value) ?? {};
  const uuid = firstString(raw, ["uuid", "id"], true);
  const platform = firstString(raw, ["platform", "osPlatform"]);
  const status = firstString(raw, ["status", "complianceStatus"]);
  const policyStatus = firstString(raw, ["policyStatus", "policyState"]);
  const lastConnectionDate = firstString(raw, ["lastConnectionDate", "lastSeen", "lastContact"]);
  const ownership = firstString(raw, ["ownership", "ownerShip"]);
  const serialNumber = firstString(raw, ["serialNumber", "serial", "imei", "udid"]);
  const userName = firstString(raw, ["userName", "username", "ownerName"]);
  const userEmail = firstString(raw, ["userEmail", "email", "ownerEmail"]);
  const assignedPolicies = assignedPolicyNames(raw);
  const name = firstString(raw, ["name", "deviceName", "displayName"]) ?? firstString(raw, ["uuid", "id"]) ?? "Unnamed device";
  return {
    ...(uuid === undefined ? {} : { uuid }),
    name,
    ...(platform === undefined ? {} : { platform }),
    ...(status === undefined ? {} : { status }),
    ...(policyStatus === undefined ? {} : { policyStatus }),
    ...(lastConnectionDate === undefined ? {} : { lastConnectionDate }),
    ...(ownership === undefined ? {} : { ownership }),
    ...(serialNumber === undefined ? {} : { serialNumber }),
    ...(userName === undefined ? {} : { userName }),
    ...(userEmail === undefined ? {} : { userEmail }),
    ...(assignedPolicies === undefined ? {} : { assignedPolicies }),
    // Keep the stable public field for compatibility without retaining or
    // returning unmodeled remote device data, credentials, or diagnostics.
    raw: {},
  };
}

function assessDevice(device: RelutionDeviceSummary, options: Required<RelutionAssessmentOptions>): RelutionDeviceAssessment {
  const issues: RelutionAssessmentIssue[] = [];
  const inactiveDays = inactiveDaysSince(device.lastConnectionDate, options.now);
  const assessedDevice = inactiveDays === undefined ? device : { ...device, inactiveDays };
  if (device.uuid === undefined || device.uuid.trim().length === 0) {
    issues.push({
      id: "device-identity-missing",
      severity: "unknown",
      message: "Device has no stable uuid or id and cannot be reliably assessed.",
      evidence: {},
    });
  }
  if (device.status === undefined) {
    issues.push({
      id: "device-status-missing",
      severity: "unknown",
      message: "Device compliance status is not exposed by the query response.",
      evidence: {},
    });
  } else if (device.status !== "COMPLIANT") {
    issues.push({
      id: "device-status-noncompliant",
      severity: "problem",
      message: `Device status is ${device.status}.`,
      evidence: { status: device.status },
    });
  }
  if (device.policyStatus === undefined) {
    issues.push({
      id: "policy-status-missing",
      severity: "unknown",
      message: "Device policy status is not exposed by the query response.",
      evidence: {},
    });
  } else if (!["APPLIED", "UPDATE"].includes(device.policyStatus)) {
    issues.push({
      id: "policy-status-not-applied",
      severity: device.policyStatus === "NONE" || device.policyStatus === "UNKNOWN" ? "problem" : "warning",
      message: `Policy status is ${device.policyStatus}.`,
      evidence: { policyStatus: device.policyStatus },
    });
  }
  addMissingPolicyIssues(issues, device, options.expectedPoliciesByPlatform);
  addInactiveIssues(issues, inactiveDays, options);
  return {
    device: assessedDevice,
    status: issues.length === 0
      ? "compliant"
      : issues.some((issue) => issue.severity === "problem" || issue.severity === "warning") ? "issue" : "not-checkable",
    issues,
  };
}

function addMissingPolicyIssues(
  issues: RelutionAssessmentIssue[],
  device: RelutionDeviceSummary,
  expectedPoliciesByPlatform: Record<string, string[]>,
): void {
  const expected = device.platform !== undefined && Object.hasOwn(expectedPoliciesByPlatform, device.platform)
    ? expectedPoliciesByPlatform[device.platform]
    : undefined;
  if (expected === undefined || expected.length === 0) {
    return;
  }
  if (device.assignedPolicies === undefined) {
    issues.push({
      id: "policy-assignment-unknown",
      severity: "unknown",
      message: `Expected policies for ${device.platform} cannot be checked because assigned policies are not exposed by the query response.`,
      evidence: { expectedPolicies: expected.join(", ") },
    });
    return;
  }
  const assigned = new Set(device.assignedPolicies.map((policy) => policy.toLowerCase()));
  const missing = expected.filter((policy) => !assigned.has(policy.toLowerCase()));
  if (missing.length > 0) {
    issues.push({
      id: "missing-policy",
      severity: "problem",
      message: `Missing expected policies: ${missing.join(", ")}.`,
      evidence: { expectedPolicies: expected.join(", "), assignedPolicies: device.assignedPolicies.join(", "), missingPolicies: missing.join(", ") },
    });
  }
}

function addInactiveIssues(
  issues: RelutionAssessmentIssue[],
  inactiveDays: number | undefined,
  options: Required<RelutionAssessmentOptions>,
): void {
  if (inactiveDays === undefined || inactiveDays < options.inactiveWarningDays) {
    return;
  }
  if (inactiveDays >= options.inactiveProblemDays) {
    issues.push(inactiveIssue("inactive-problem", "problem", inactiveDays, options.inactiveProblemDays));
    return;
  }
  issues.push(inactiveIssue("inactive-warning", "warning", inactiveDays, options.inactiveWarningDays));
}

function inactiveIssue(
  id: "inactive-problem" | "inactive-warning",
  severity: "problem" | "warning",
  inactiveDays: number,
  thresholdDays: number,
): RelutionAssessmentIssue {
  return {
    id,
    severity,
    message: `Device has not checked in for ${String(inactiveDays)} days.`,
    evidence: { inactiveDays: String(inactiveDays), thresholdDays: String(thresholdDays) },
  };
}

function normalizeAssessmentOptions(options: RelutionAssessmentOptions): Required<RelutionAssessmentOptions> {
  const inactiveWarningDays = options.inactiveWarningDays ?? 30;
  const inactiveProblemDays = options.inactiveProblemDays ?? 90;
  if (!Number.isSafeInteger(inactiveWarningDays) || inactiveWarningDays < 0) {
    throw new Error("Inactive warning days must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(inactiveProblemDays) || inactiveProblemDays < 0) {
    throw new Error("Inactive problem days must be a non-negative safe integer");
  }
  if (inactiveProblemDays < inactiveWarningDays) {
    throw new Error("Inactive problem days must be greater than or equal to inactive warning days");
  }
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Relution assessment time must be a valid date");
  }
  return {
    expectedPoliciesByPlatform: normalizeExpectedPolicies(options.expectedPoliciesByPlatform),
    inactiveWarningDays,
    inactiveProblemDays,
    now,
  };
}

function normalizeExpectedPolicies(value: unknown): Record<string, string[]> {
  const normalized = Object.create(null) as Record<string, string[]>;
  if (value === undefined) {
    return normalized;
  }
  const record = asRecord(value);
  if (record === undefined) {
    throw new Error("Expected policies by platform must be an object");
  }
  for (const [platform, policies] of Object.entries(record)) {
    if (!Array.isArray(policies) || !policies.every((policy) => typeof policy === "string")) {
      throw new Error(`Expected policies for platform ${platform} must be a string array`);
    }
    normalized[platform] = [...policies];
  }
  return normalized;
}

function validateRelutionAssessmentOptions(options: RelutionAssessmentOptions): void {
  normalizeAssessmentOptions(options);
}

function inactiveDaysSince(value: string | undefined, now: Date): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

function firstString(record: Record<string, unknown>, keys: string[], trim = false): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const candidate = trim ? value.trim() : value;
    if (candidate.length > 0) return candidate;
  }
  return undefined;
}

function countBy(values: string[]): Record<string, number> {
  const counts = Object.create(null) as Record<string, number>;
  for (const value of values) {
    const previous = Object.hasOwn(counts, value) ? counts[value] : undefined;
    counts[value] = (previous ?? 0) + 1;
  }
  return counts;
}

function assignedPolicyNames(record: Record<string, unknown>): string[] | undefined {
  for (const key of ["assignedPolicies", "policies", "policyNames", "appliedPolicies"]) {
    const value = record[key];
    const names = stringList(value);
    if (names !== undefined) {
      return names;
    }
  }
  return undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  if (value.length === 0) {
    return [];
  }
  const names = value.flatMap((entry) => {
    if (typeof entry === "string" && entry.length > 0) {
      return [entry];
    }
    const record = asRecord(entry);
    const name = record === undefined ? undefined : firstString(record, ["name", "policyName", "title", "displayName", "uuid", "id"]);
    return name === undefined ? [] : [name];
  });
  return names.length === 0 ? undefined : names;
}
