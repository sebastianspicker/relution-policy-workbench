/** Contracts shared by focused Relution editor route modules. */
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  RelutionAssessmentReport,
  RelutionConnection,
  RelutionDeviceQueryResult,
  RelutionDeviceSummary,
} from "./relution-api.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";

export interface RelutionEditorRuntime {
  connection?: RelutionConnection;
  lastDevices: RelutionDeviceSummary[];
  lastDeviceQuery?: Pick<RelutionDeviceQueryResult, "count" | "total" | "truncated">;
  assessments?: Map<string, RelutionAssessmentReport>;
}

export type RelutionRouteHandler = (
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  runtime: RelutionEditorRuntime,
  workspace: string,
  allowLocalServiceHosts: boolean,
  transportOptions: HttpServiceTransportOptions,
) => boolean | Promise<boolean>;
