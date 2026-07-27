/** Immutable workspace and catalog fixtures for editor controller tests. */
import type { AppleCompatReport } from "../../../src/apple-compat.js";
import type { EditorSidecarState } from "../../../src/sidecar.js";
import type { ConfigurationTemplate, RelutionTemplateBundle } from "../../../src/templates.js";
import type { PolicyWorkspace, WorkspaceValidationResult } from "../../../src/workspace.js";
import { emptyAppleSchemaCatalog } from "./editor-record-utils.js";
import type { AppState } from "./types.js";

const SINGLE_TEMPLATE: ConfigurationTemplate = {
  type: "NATIVE_SINGLE", label: "Native Single", schemaName: "NativeSingle", platforms: ["IOS"], enrollmentTypes: [], multiConfig: false, portalHidden: false, placeholders: [], required: [],
  fields: [{ path: "name", label: "Name", kind: "string", required: false, nullable: false, enumValues: [], enumLabels: {} }],
};
const MULTI_TEMPLATE: ConfigurationTemplate = {
  type: "NATIVE_MULTI", label: "Native Multi", schemaName: "NativeMulti", platforms: ["IOS"], enrollmentTypes: [], multiConfig: true, portalHidden: false, placeholders: [], required: [], fields: [],
};
const BUNDLE: RelutionTemplateBundle = {
  serverVersion: "26.1.1", sourceImage: "relution/server:26.1.1", sourceImageDigest: "sha256:test", generatedAt: "2026-04-23T00:00:00.000Z",
  refreshDiagnostics: { runtimeMetadata: { source: "reflected", reflectedCount: 2, configurationTypeCount: 2 }, iosSystemAppsLoaded: false, springConfigurationMetadataLoaded: false },
  platforms: ["IOS"], enrollmentTypes: [], configurationTypes: [SINGLE_TEMPLATE, MULTI_TEMPLATE], schemas: {}, iosSystemApps: {}, springConfigurationMetadata: {},
};
const WORKSPACE: PolicyWorkspace = {
  metadata: {}, report: {}, policies: [{ path: "policies/policy_test.json", document: { name: "Test Policy", platform: "IOS", versions: [{ uuid: "VERSION-1", configurations: [{ uuid: "CONF-1", details: { uuid: "DETAIL-1", type: "NATIVE_SINGLE", name: "Original name" } }] }] } }],
};
const VALIDATION: WorkspaceValidationResult = { ok: true, errors: [] };
const APPLE_COMPAT: AppleCompatReport = {
  summary: { totalJamfGapSettings: 0, mobileconfigBacked: 0, notMobileconfigWireable: 0, relutionHasMobileconfigTransport: true, relutionMobileconfigPlatforms: ["IOS"] }, sources: [], settings: [],
};
const APPLE_SCHEMA = {
  ...emptyAppleSchemaCatalog(),
  source: { repository: "apple/device-management", revision: "test-revision", generatedAt: "2026-04-23T00:00:00.000Z" },
};
const SIDECAR: EditorSidecarState = { version: 1, appleSchemaRevision: "test-revision", mobileConfigRestore: [], ddmArtifacts: [], mdmCommandArtifacts: [], customManifests: [] };

function copy<T>(value: T): T { return structuredClone(value); }

export function createWorkspace(): PolicyWorkspace { return copy(WORKSPACE); }
export function createValidation(): WorkspaceValidationResult { return copy(VALIDATION); }
export function createSidecar(): EditorSidecarState { return copy(SIDECAR); }
export function createAppState(): AppState {
  return { bundle: copy(BUNDLE), workspace: createWorkspace(), validation: createValidation(), outputFile: "stale-build.rexp", keySet: false, keyValidated: false, appleCompat: copy(APPLE_COMPAT), appleSchema: copy(APPLE_SCHEMA), sidecar: createSidecar() };
}
