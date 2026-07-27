/** Public compatibility facade for editor sidecar data and operations. */
export {
  addDdmArtifact,
  addMdmCommandArtifact,
  removeDdmArtifact,
  removeMdmCommandArtifact,
  updateDdmArtifact,
  updateMdmCommandArtifact,
} from "./sidecar-artifact-actions.js";
export { ddmAuthoringEntryError, isDdmAuthoringEntry, isMdmCommandEntry, mdmCommandEntryError } from "./sidecar-artifact-contracts.js";
export { reconcileMobileConfigRestoreEntries } from "./sidecar-mobileconfig-reconcile.js";
export {
  loadEditorSidecar,
  recordMobileConfigRestoreEntries,
  replaceEditorSidecarFromWorkspace,
  resetEditorSidecar,
  saveEditorSidecar,
} from "./sidecar-persistence.js";
export {
  MAX_EDITOR_SIDECAR_JSON_BYTES,
  SidecarInputError,
  type EditorSidecarState,
  type MobileConfigRestoreEntry,
} from "./sidecar-types.js";
