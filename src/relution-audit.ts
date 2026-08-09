// Runs read-only Relution device queries and turns results into assessment reports.
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import type {
  RelutionAssessmentOptions,
  RelutionAssessmentReport,
  RelutionConnection,
  RelutionDeviceQueryInput,
  RelutionDeviceQueryResult,
} from "./relution-api-types.js";
import { assessmentCompleteness, createRelutionAssessmentReport, validateRelutionAssessmentOptions } from "./relution-assessment.js";
import { queryRelutionDevices } from "./relution-device-query.js";

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
