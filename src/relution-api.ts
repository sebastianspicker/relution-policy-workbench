/** Public facade for the Relution service API. */

export {
  normalizeRelutionConnection,
  publicRelutionSession,
} from "./relution-connection.js";
export {
  applyRelutionDeviceQueryOptions,
  MAX_RELUTION_DEVICE_QUERY_LIMIT,
  optionalRelutionDeviceSortField,
  queryRelutionDevices,
  requireRelutionDeviceSortField,
  testRelutionConnection,
  unsupportedRelutionDeviceSortFieldMessage,
} from "./relution-device-query.js";
export { normalizeRelutionDeviceSummary } from "./relution-device-normalization.js";
export {
  assessRelutionDevices,
  assessmentCompleteness,
  createRelutionAssessmentReport,
} from "./relution-assessment.js";
export { auditRelutionDevices } from "./relution-audit.js";
export { assertRelutionReadOnlyRequest } from "./relution-transport.js";
export type {
  RelutionAssessmentCompleteness,
  RelutionAssessmentIssue,
  RelutionAssessmentOptions,
  RelutionAssessmentReport,
  RelutionConnection,
  RelutionConnectionInput,
  RelutionConnectionTestResult,
  RelutionDeviceAssessment,
  RelutionDeviceQueryInput,
  RelutionDeviceQueryOptions,
  RelutionDeviceQueryResult,
  RelutionDeviceSortField,
  RelutionDeviceSummary,
  RelutionProtocol,
  RelutionPublicSession,
} from "./relution-api-types.js";
