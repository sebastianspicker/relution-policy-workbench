/** Handles persistence of completed Relution assessments and report listings. */
import { requireString } from "./editor-api-request-input.js";
import { badRequest } from "./editor-http-input.js";
import { readJsonBody } from "./editor-json-body.js";
import { sendJson } from "./editor-routes-utils.js";
import type { RelutionRouteHandler } from "./relution-editor-contract.js";
import { listRelutionReports, writeRelutionReport } from "./relution-reports.js";

export const handleRelutionReportRoute: RelutionRouteHandler = async (url, request, response, runtime, workspace) => {
  if (url.pathname === "/api/relution/reports/compliance" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (Object.keys(body).length !== 1 || typeof body.assessmentId !== "string") throw badRequest("Compliance report writes require one assessmentId");
    const report = runtime.assessments?.get(requireString(body, "assessmentId"));
    if (report === undefined) throw badRequest("Relution assessment is unavailable or expired");
    sendJson(response, 200, writeRelutionReport(workspace, report));
    return true;
  }
  if (url.pathname !== "/api/relution/reports" || request.method !== "GET") return false;
  sendJson(response, 200, { reports: listRelutionReports(workspace) });
  return true;
};
