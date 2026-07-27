/** Provides the public Apple compatibility API surface. */
export type {
  AppleCompatReport,
  AppleCompatSetting,
} from "./apple-compat-types.js";
export { APPLE_COMPAT_HINT, APPLE_COMPAT_SETTINGS } from "./apple-compat-settings.js";
export { createAppleCompatReport, renderAppleCompatReportMarkdown } from "./apple-compat-report.js";
export {
  appleCompatSettingsForPlatform,
  createAppleCompatConfiguration,
  extractAppleCompatPayloadBodyJson,
  extractAppleCompatValues,
  findAppleCompatSetting,
  findAppleCompatSettingForDetails,
  updateAppleCompatDetails,
  updateAppleCompatDetailsFromPayloadBodyJson,
} from "./apple-compat-values.js";
