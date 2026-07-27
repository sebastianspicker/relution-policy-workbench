/** Public Apple schema API; implementation is separated by catalog, values, profiles, and artifacts. */
import { customSettingsSchemaEntry } from "./apple-schema-custom-settings.js";
import { createAppleSchemaProfileConfiguration } from "./apple-schema-profile-details.js";
import type { CustomSettingsInput } from "./apple-schema-types.js";
import type { JsonRecord } from "./utils/json-guards.js";

export type {
  AppleAvailability,
  AppleSchemaCatalog,
  AppleSchemaEntry,
  AppleSchemaField,
  AppleSchemaFieldKind,
  AppleSchemaKind,
  AppleSchemaValues,
  CustomSettingsInput,
  DdmArtifact,
  MdmCommandArtifact,
} from "./apple-schema-types.js";
export { appleSchemaEntriesForPlatform, findAppleSchemaEntry, findAppleSchemaProfileForDetails } from "./apple-schema-catalog-access.js";
export { createAppleSchemaProfileConfiguration, updateAppleSchemaProfileDetails } from "./apple-schema-profile-details.js";
export { createDdmArtifact, extractAppleSchemaPayloadBodyJson, extractAppleSchemaValues, createMdmCommandArtifact, updateAppleSchemaProfileDetailsFromPayloadBodyJson } from "./apple-schema-body.js";

export function createCustomSettingsConfiguration(input: CustomSettingsInput): JsonRecord {
  return createAppleSchemaProfileConfiguration(customSettingsSchemaEntry(input), {
    domain: input.domain,
    settingsJson: JSON.stringify(input.settings, null, 2),
  });
}
