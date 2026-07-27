// Supports generated configuration-field rendering.
import type { ConfigurationTemplate } from "../../../../src/templates.js";

export function createTemplate(fields: ConfigurationTemplate["fields"]): ConfigurationTemplate {
  return {
    type: "TEST",
    label: "Test",
    schemaName: "TestSchema",
    platforms: ["IOS"],
    enrollmentTypes: [],
    multiConfig: false,
    portalHidden: false,
    placeholders: [],
    required: [],
    fields,
  };
}

export function createNestedObjectField(): ConfigurationTemplate["fields"][number] {
  return {
    path: "nested",
    label: "Nested",
    kind: "object",
    required: false,
    nullable: false,
    enumValues: [],
    enumLabels: {},
  };
}

export function createDnsTemplate(): ConfigurationTemplate {
  return {
    type: "APPLE_DNS_SETTINGS",
    label: "Apple DNS Settings",
    schemaName: "AppleDnsSettingsConfiguration",
    platforms: ["IOS", "MACOS"],
    enrollmentTypes: ["IOS", "MACOS"],
    multiConfig: true,
    portalHidden: false,
    placeholders: [],
    required: [],
    fields: [
      { path: "dnsSettings", label: "DNS Settings", kind: "object", required: false, nullable: false, enumValues: [], enumLabels: {} },
      {
        path: "dnsSettings.dnsProtocol",
        label: "DNS Settings DNS Protocol",
        kind: "string",
        required: false,
        nullable: false,
        enumValues: ["HTTPS", "TLS"],
        enumLabels: { HTTPS: "HTTPS", TLS: "TLS" },
      },
      {
        path: "dnsSettings.serverAddresses",
        label: "DNS Settings Server Addresses",
        kind: "array",
        required: false,
        nullable: false,
        enumValues: [],
        enumLabels: {},
        itemKind: "string",
      },
      {
        path: "dnsSettings.serverUrl",
        label: "DNS Settings Server URL",
        kind: "string",
        required: false,
        nullable: false,
        enumValues: [],
        enumLabels: {},
      },
      {
        path: "dnsSettings.supplementalMatchDomains",
        label: "DNS Settings Supplemental Match Domains",
        kind: "array",
        required: false,
        nullable: false,
        enumValues: [],
        enumLabels: {},
        itemKind: "string",
      },
      {
        path: "prohibitDisablement",
        label: "Prohibit Disablement",
        kind: "boolean",
        required: false,
        nullable: false,
        enumValues: [],
        enumLabels: {},
      },
    ],
  };
}

export function createObjectListTemplate(): ConfigurationTemplate {
  return {
    type: "TEST_OBJECT_LIST",
    label: "Test Object List",
    schemaName: "TestObjectListConfiguration",
    platforms: ["IOS"],
    enrollmentTypes: [],
    multiConfig: false,
    portalHidden: false,
    placeholders: [],
    required: [],
    fields: [
      {
        path: "rules",
        label: "Rules",
        kind: "array",
        required: false,
        nullable: false,
        enumValues: [],
        enumLabels: {},
        itemKind: "object",
        itemFields: [
          { path: "name", label: "Name", kind: "string", required: false, nullable: false, enumValues: [], enumLabels: {} },
          { path: "priority", label: "Priority", kind: "integer", required: false, nullable: false, enumValues: [], enumLabels: {} },
          {
            path: "weights",
            label: "Weights",
            kind: "array",
            required: false,
            nullable: false,
            enumValues: [],
            enumLabels: {},
            itemKind: "number",
          },
          { path: "options", label: "Options", kind: "object", required: false, nullable: false, enumValues: [], enumLabels: {} },
          { path: "options.enabled", label: "Options Enabled", kind: "boolean", required: false, nullable: false, enumValues: [], enumLabels: {} },
          {
            path: "options.matchDomains",
            label: "Options Match Domains",
            kind: "array",
            required: false,
            nullable: false,
            enumValues: [],
            enumLabels: {},
            itemKind: "string",
          },
        ],
      },
    ],
  };
}
