/**
 * Compatibility exports for editor modules that are being migrated independently.
 * New modules should import from their focused owner directly.
 */
export { editorApiFetch, loadState, networkEditorAuthHeaders, postJson } from "./editor-api-client.js";
export {
  APPLE_COMPAT_ADD_PREFIX,
  APPLE_SCHEMA_ADD_PREFIX,
  CUSTOM_SETTINGS_ADD_VALUE,
  NATIVE_ADD_PREFIX,
  isPrimitiveKind,
  parseAddSelection,
} from "./editor-configuration-utils.js";
export { fileToBase64, objectListRows, parseIntegerValue, textAreaValue } from "./editor-field-values.js";
export { emptyObjectListRow } from "./editor-object-list.js";
export { deletePath, getPath, setPath } from "./editor-object-path.js";
export {
  asRecord,
  emptyAppleSchemaCatalog,
  isEditorSidecarState,
  readJsonResponse,
} from "./editor-record-utils.js";
export { cloneWorkspace, firstConfigurationSelection, newBrowserUuid, selectedConfiguration, versionRecord } from "./editor-workspace-utils.js";
