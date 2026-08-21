/** Retains public runtime and type contracts that external integrations may consume. */
import assert from "node:assert/strict";
import test from "node:test";
import { extractAppleCompatPayloadBodyJson, updateAppleCompatDetailsFromPayloadBodyJson } from "../src/apple-compat.js";
import { DEFAULT_APPLE_SCHEMA_CATALOG_PATH, DEFAULT_APPLE_SCHEMA_REVISION } from "../src/apple-schema-catalog.js";
import type { CustomSettingsInput } from "../src/apple-schema.js";
import type { ComplianceSourceCatalogs } from "../src/compliance.js";
import { resolveStaticAssetPath } from "../src/editor-server.js";
import type { EditorServerHandle, EditorServerOptions } from "../src/editor-server.js";
import type { HttpServiceTransportAdapter } from "../src/http-service-transport.js";
import type { OutboundHostPolicyResult, ServiceAddressResolver } from "../src/outbound-host-policy.js";
import { createRelutionAssessmentReport, assertRelutionReadOnlyRequest } from "../src/relution-api.js";
import type { RelutionAssessmentCompleteness, RelutionConnectionTestResult, RelutionDeviceQueryOptions } from "../src/relution-api.js";
import { MAX_RETAINED_RELUTION_REPORTS, renderRelutionMarkdownReport } from "../src/relution-reports.js";
import { decryptRelutionPayload, encryptRelutionPayload } from "../src/rexp.js";
import { inspectImageDigest, resolveTemplateRefreshEntryTarget, templateRefreshDockerIsolationArgs } from "../src/template-refresh.js";
import { parseMobileConfig } from "../web/src/editor/mobileconfig-editor.js";
import { policyMatches } from "../web/src/editor/PolicyNavigator.js";
import {
  CUSTOM_THEME_STORAGE_NAME,
  DEFAULT_THEME,
  THEME_STORAGE_NAME,
  parseCorporateTheme,
  parseCustomThemeTokens,
  readCustomThemeTokens,
  resetCustomThemeTokens,
  validateCustomThemeContrast,
  writeCustomThemeTokens,
} from "../web/src/editor/theme.js";
import type { ThemeStorage } from "../web/src/editor/theme.js";
import { MAX_WORKSPACE_JSON_BYTES, MAX_WORKSPACE_POLICY_FILES, MAX_WORKSPACE_TOTAL_JSON_BYTES } from "../src/workspace.js";
import type { NewWorkspaceOptions } from "../src/workspace.js";

type RetainedPublicTypes = [
  CustomSettingsInput,
  ComplianceSourceCatalogs,
  EditorServerHandle,
  EditorServerOptions,
  HttpServiceTransportAdapter,
  OutboundHostPolicyResult,
  ServiceAddressResolver,
  RelutionAssessmentCompleteness,
  RelutionConnectionTestResult,
  RelutionDeviceQueryOptions,
  NewWorkspaceOptions,
  ThemeStorage,
];

test("retains the public API contract", () => {
  const retainedTypes: RetainedPublicTypes | undefined = undefined;
  assert.equal(retainedTypes, undefined);

  for (const value of [
    extractAppleCompatPayloadBodyJson,
    updateAppleCompatDetailsFromPayloadBodyJson,
    resolveStaticAssetPath,
    createRelutionAssessmentReport,
    assertRelutionReadOnlyRequest,
    renderRelutionMarkdownReport,
    decryptRelutionPayload,
    encryptRelutionPayload,
    inspectImageDigest,
    resolveTemplateRefreshEntryTarget,
    templateRefreshDockerIsolationArgs,
    parseMobileConfig,
    policyMatches,
    parseCorporateTheme,
    parseCustomThemeTokens,
    readCustomThemeTokens,
    resetCustomThemeTokens,
    validateCustomThemeContrast,
    writeCustomThemeTokens,
  ]) assert.equal(typeof value, "function");

  for (const value of [
    DEFAULT_APPLE_SCHEMA_CATALOG_PATH,
    DEFAULT_APPLE_SCHEMA_REVISION,
    MAX_RETAINED_RELUTION_REPORTS,
    MAX_WORKSPACE_JSON_BYTES,
    MAX_WORKSPACE_POLICY_FILES,
    MAX_WORKSPACE_TOTAL_JSON_BYTES,
    CUSTOM_THEME_STORAGE_NAME,
    DEFAULT_THEME,
    THEME_STORAGE_NAME,
  ]) assert.ok(["number", "string"].includes(typeof value));
});
