// Provides reusable Relution template fixtures for tests.
import type { ConfigurationTemplate, RelutionTemplateBundle } from "../src/templates.js";

export function createTestTemplateBundle(options: {
  readonly platforms?: string[];
  readonly configurationTypes?: ConfigurationTemplate[];
  readonly serverVersion?: string;
  readonly sourceImage?: string;
  readonly sourceImageDigest?: string;
  readonly generatedAt?: string;
  readonly schemas?: RelutionTemplateBundle["schemas"];
} = {}): RelutionTemplateBundle {
  const configurationTypes = options.configurationTypes ?? [];
  return {
    serverVersion: options.serverVersion ?? "26.1.1",
    sourceImage: options.sourceImage ?? "relution/server:26.1.1",
    sourceImageDigest: options.sourceImageDigest ?? "sha256:test",
    generatedAt: options.generatedAt ?? "2026-04-24T00:00:00.000Z",
    refreshDiagnostics: {
      runtimeMetadata: {
        source: "reflected",
        reflectedCount: configurationTypes.length,
        configurationTypeCount: configurationTypes.length,
      },
      iosSystemAppsLoaded: false,
      springConfigurationMetadataLoaded: false,
    },
    platforms: options.platforms ?? ["IOS"],
    enrollmentTypes: [],
    configurationTypes,
    schemas: options.schemas ?? {},
    iosSystemApps: {},
    springConfigurationMetadata: {},
  };
}
