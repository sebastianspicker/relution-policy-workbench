// Supports Relution Docker end-to-end test scenarios and helpers.
import type { PolicyConfiguration } from "./relution-docker-e2e-types.js";

export function configurationsHaveType(
  configurations: PolicyConfiguration[],
  type: string,
): boolean {
  return configurations.some((configuration) => configuration.details?.type === type);
}

export function configurationsHaveTypes(
  configurations: PolicyConfiguration[],
  types: string[],
): boolean {
  return types.every((type) => configurationsHaveType(configurations, type));
}

export function configurationTypes(configurations: PolicyConfiguration[]): string[] {
  return [
    ...new Set(
      configurations
        .map((configuration) => configuration.details?.type)
        .filter((type): type is string => type !== undefined),
    ),
  ].sort();
}
