/** Public sidecar data contracts shared by persistence and editor routes. */
import type { DdmArtifact, MdmCommandArtifact } from "./apple-schema.js";

export const EDITOR_SIDECAR_FILE = "editor-sidecar.json";
export const MAX_EDITOR_SIDECAR_JSON_BYTES = 16 * 1024 * 1024;

export interface EditorSidecarState {
  version: 1;
  appleSchemaRevision?: string;
  mobileConfigRestore: MobileConfigRestoreEntry[];
  ddmArtifacts: DdmArtifact[];
  mdmCommandArtifacts: MdmCommandArtifact[];
  customManifests: CustomManifestEntry[];
}

export class SidecarInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SidecarInputError";
  }
}

export interface MobileConfigRestoreEntry {
  policyPath: string;
  policyName: string;
  platform: string;
  configurationUuid: string;
  versionUuid?: string;
  versionIndex?: number;
  payloadType: string;
  displayName: string;
  signatureState: string;
  configuration: Record<string, unknown>;
}

export interface CustomManifestEntry {
  uuid: string;
  name: string;
  schema: Record<string, unknown>;
}

export function emptyEditorSidecar(): EditorSidecarState {
  return {
    version: 1,
    mobileConfigRestore: [],
    ddmArtifacts: [],
    mdmCommandArtifacts: [],
    customManifests: [],
  };
}
