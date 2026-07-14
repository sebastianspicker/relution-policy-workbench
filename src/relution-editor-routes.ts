import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { assignOptionalHttpConnectionFields, badRequest, optionalRecord, optionalString, readJsonBody, requireNumber, requireString } from "./editor-server-helpers.js";
import { requireRuntimeConnection, sendJson } from "./editor-routes-utils.js";
import { literalServiceHostPolicyError } from "./outbound-host-policy.js";
import {
  applyRelutionDeviceQueryOptions,
  assessmentCompleteness,
  assessRelutionDevices,
  auditRelutionDevices,
  MAX_RELUTION_DEVICE_QUERY_LIMIT,
  normalizeRelutionConnection,
  publicRelutionSession,
  queryRelutionDevices,
  testRelutionConnection,
  type RelutionAssessmentReport,
  type RelutionAssessmentOptions,
  type RelutionConnection,
  type RelutionConnectionInput,
  type RelutionDeviceQueryInput,
  type RelutionDeviceQueryResult,
  type RelutionDeviceSummary,
  type RelutionDeviceSortField,
} from "./relution-api.js";
import { listRelutionReports, writeRelutionReport } from "./relution-reports.js";

export interface RelutionEditorRuntime {
  connection?: RelutionConnection;
  lastDevices: RelutionDeviceSummary[];
  lastDeviceQuery?: Pick<RelutionDeviceQueryResult, "count" | "total" | "truncated">;
  assessments?: Map<string, RelutionAssessmentReport>;
}

const MAX_CACHED_ASSESSMENTS = 16;

type RelutionRouteHandler = (
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: RelutionEditorRuntime,
  workspace: string,
  allowLocalServiceHosts: boolean,
) => boolean | Promise<boolean>;

export async function handleRelutionApiRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: RelutionEditorRuntime,
  workspace: string,
  allowLocalServiceHosts = false,
): Promise<boolean> {
  if (!url.pathname.startsWith("/api/relution")) {
    return false;
  }
  for (const handler of RELUTION_ROUTE_HANDLERS) {
    if (await handler(url, request, response, runtime, workspace, allowLocalServiceHosts)) return true;
  }
  sendJson(response, 404, { error: `Unknown Relution endpoint: ${request.method ?? "GET"} ${url.pathname}` });
  return true;
}

async function handleRelutionSessionRoute(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: RelutionEditorRuntime,
  _workspace: string,
  allowLocalServiceHosts: boolean,
): Promise<boolean> {
  if (url.pathname === "/api/relution/session" && request.method === "GET") {
    sendJson(response, 200, publicRelutionSession(runtime.connection));
    return true;
  }
  if (url.pathname === "/api/relution/session" && request.method === "POST") {
    runtime.connection = await parseAllowedRelutionConnection(await readJsonBody(request), allowLocalServiceHosts);
    runtime.lastDevices = [];
    delete runtime.lastDeviceQuery;
    runtime.assessments?.clear();
    sendJson(response, 200, publicRelutionSession(runtime.connection));
    return true;
  }
  if (url.pathname === "/api/relution/test" && request.method === "POST") {
    sendJson(response, 200, await testRelutionConnection(await requireOutboundConnection(runtime, allowLocalServiceHosts)));
    return true;
  }
  return false;
}

async function handleRelutionDeviceRoute(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: RelutionEditorRuntime,
  _workspace: string,
  allowLocalServiceHosts: boolean,
): Promise<boolean> {
  if (url.pathname === "/api/relution/devices/query" && request.method === "POST") {
    const result = await queryRelutionDevices(await requireOutboundConnection(runtime, allowLocalServiceHosts), parseDeviceQuery(await readJsonBody(request)));
    runtime.lastDevices = result.devices;
    runtime.lastDeviceQuery = result;
    sendJson(response, 200, result);
    return true;
  }
  if (url.pathname === "/api/relution/devices/assess" && request.method === "POST") {
    const body = await readJsonBody(request);
    const suppliedDevices = parseDevices(body);
    const devices = suppliedDevices ?? runtime.lastDevices;
    const completeness = suppliedDevices === undefined && runtime.lastDeviceQuery !== undefined
      ? assessmentCompleteness(runtime.lastDeviceQuery)
      : assessmentCompleteness({ count: devices.length, truncated: false });
    const report = assessRelutionDevices(requireRuntimeConnection(runtime, "Relution").baseUrl, devices, completeness);
    sendJson(response, 200, { report, assessmentId: rememberAssessment(runtime, report) });
    return true;
  }
  if (url.pathname === "/api/relution/devices/audit" && request.method === "POST") {
    const body = await readJsonBody(request);
    const result = await auditRelutionDevices(await requireOutboundConnection(runtime, allowLocalServiceHosts), parseDeviceQuery(body), parseAssessmentOptions(body));
    runtime.lastDevices = result.query.devices;
    runtime.lastDeviceQuery = result.query;
    sendJson(response, 200, { ...result, assessmentId: rememberAssessment(runtime, result.report) });
    return true;
  }
  return false;
}

async function handleRelutionReportRoute(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: RelutionEditorRuntime,
  workspace: string,
): Promise<boolean> {
  if (url.pathname === "/api/relution/reports/compliance" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.assessmentId !== "string") {
      throw badRequest("Compliance report writes require one assessmentId");
    }
    const report = runtime.assessments?.get(requireString(body, "assessmentId"));
    if (report === undefined) {
      throw badRequest("Relution assessment is unavailable or expired");
    }
    sendJson(response, 200, writeRelutionReport(workspace, report));
    return true;
  }
  if (url.pathname === "/api/relution/reports" && request.method === "GET") {
    sendJson(response, 200, { reports: listRelutionReports(workspace) });
    return true;
  }
  return false;
}

const RELUTION_ROUTE_HANDLERS: readonly RelutionRouteHandler[] = [
  handleRelutionSessionRoute,
  handleRelutionDeviceRoute,
  handleRelutionReportRoute,
];

function rememberAssessment(runtime: RelutionEditorRuntime, report: RelutionAssessmentReport): string {
  const assessments = runtime.assessments ?? new Map<string, RelutionAssessmentReport>();
  runtime.assessments = assessments;
  while (assessments.size >= MAX_CACHED_ASSESSMENTS) {
    const oldestId = assessments.keys().next().value as string | undefined;
    if (oldestId === undefined) break;
    assessments.delete(oldestId);
  }
  const assessmentId = randomUUID();
  assessments.set(assessmentId, report);
  return assessmentId;
}

async function parseAllowedRelutionConnection(body: Record<string, unknown>, allowLocalServiceHosts: boolean): Promise<RelutionConnection> {
  const connection = normalizeRelutionConnection({ ...parseRelutionConnectionInput(body), allowLocalServiceHosts });
  const policyError = literalServiceHostPolicyError("Relution", connection.host, allowLocalServiceHosts);
  if (policyError !== undefined) throw badRequest(policyError);
  return connection;
}

function parseRelutionConnectionInput(body: Record<string, unknown>): RelutionConnectionInput {
  const input: RelutionConnectionInput = {
    host: requireString(body, "host"),
    apiToken: requireString(body, "apiToken"),
  };
  assignOptionalHttpConnectionFields(input, body);
  return input;
}

function parseAssessmentOptions(body: Record<string, unknown>): RelutionAssessmentOptions {
  const options: RelutionAssessmentOptions = {};
  const expectedPoliciesByPlatform = optionalExpectedPolicies(body);
  const inactiveWarningDays = optionalPositiveInteger(body, "inactiveWarningDays");
  const inactiveProblemDays = optionalPositiveInteger(body, "inactiveProblemDays");
  if (expectedPoliciesByPlatform !== undefined) {
    options.expectedPoliciesByPlatform = expectedPoliciesByPlatform;
  }
  if (inactiveWarningDays !== undefined) {
    options.inactiveWarningDays = inactiveWarningDays;
  }
  if (inactiveProblemDays !== undefined) {
    options.inactiveProblemDays = inactiveProblemDays;
  }
  if ((inactiveProblemDays ?? 90) < (inactiveWarningDays ?? 30)) {
    throw badRequest("inactiveProblemDays must be greater than or equal to inactiveWarningDays");
  }
  return options;
}

function parseDeviceQuery(body: Record<string, unknown>): RelutionDeviceQueryInput {
  const limit = optionalPositiveInteger(body, "limit") ?? 100;
  if (limit > MAX_RELUTION_DEVICE_QUERY_LIMIT) {
    throw badRequest(`Relution device query limit must not exceed ${String(MAX_RELUTION_DEVICE_QUERY_LIMIT)}`);
  }
  const query: RelutionDeviceQueryInput = {
    limit,
    offset: optionalPositiveInteger(body, "offset") ?? 0,
  };
  const platforms = optionalStringArray(body, "platforms");
  const statuses = optionalStringArray(body, "statuses");
  const ownerships = optionalStringArray(body, "ownerships");
  const search = optionalString(body, "search");
  const sortField = optionalSortField(body);
  const sortAscending = optionalBoolean(body, "sortAscending");
  return applyRelutionDeviceQueryOptions(query, { platforms, statuses, ownerships, search, sortField, sortAscending });
}

async function requireOutboundConnection(runtime: RelutionEditorRuntime, allowLocalServiceHosts: boolean): Promise<RelutionConnection> {
  const connection = requireRuntimeConnection(runtime, "Relution");
  return connection.allowLocalServiceHosts === allowLocalServiceHosts ? connection : { ...connection, allowLocalServiceHosts };
}

function parseDevices(body: Record<string, unknown>): RelutionDeviceSummary[] | undefined {
  const rawDevices = body.devices;
  if (rawDevices === undefined) {
    return undefined;
  }
  if (!Array.isArray(rawDevices)) {
    throw badRequest("Expected devices array");
  }
  return rawDevices.map((entry) => {
    const record = optionalRecord({ entry }, "entry");
    if (record === undefined || typeof record.name !== "string" || typeof record.raw !== "object" || record.raw === null || Array.isArray(record.raw)) {
      throw badRequest("Invalid device summary");
    }
    return record as unknown as RelutionDeviceSummary;
  });
}

function optionalPositiveInteger(body: Record<string, unknown>, key: string): number | undefined {
  if (body[key] === undefined) {
    return undefined;
  }
  const value = requireNumber(body, key);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw badRequest(`Expected non-negative integer for ${key}`);
  }
  return value;
}

function optionalStringArray(body: Record<string, unknown>, key: string): string[] | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw badRequest(`Expected string array for ${key}`);
  }
  return value;
}

function optionalExpectedPolicies(body: Record<string, unknown>): Record<string, string[]> | undefined {
  const value = body.expectedPoliciesByPlatform;
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw badRequest("Expected expectedPoliciesByPlatform object");
  }
  const result: Record<string, string[]> = {};
  for (const [platform, policies] of Object.entries(value)) {
    if (!Array.isArray(policies) || !policies.every((policy) => typeof policy === "string")) {
      throw badRequest(`Expected string array for expectedPoliciesByPlatform.${platform}`);
    }
    result[platform] = policies;
  }
  return result;
}

function optionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw badRequest(`Expected boolean body field: ${key}`);
  }
  return value;
}

function optionalSortField(body: Record<string, unknown>): RelutionDeviceSortField | undefined {
  const value = optionalString(body, "sortField");
  if (value === undefined) {
    return undefined;
  }
  if (!["lastConnectionDate", "name", "platform", "status", "policyStatus"].includes(value)) {
    throw badRequest(`Unsupported Relution device sort field: ${value}`);
  }
  return value as RelutionDeviceSortField;
}
