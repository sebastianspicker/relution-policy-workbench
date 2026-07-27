/** Extracts comparable payload details from a policy workspace. */
import { asRecord } from "./editor-utils.js";
import type { EditorController, JsonRecord } from "./types.js";

export function workspaceConfigurationDetails(workspace: EditorController["state"]["workspace"]): readonly JsonRecord[] {
  return workspace.policies.flatMap((policy) => {
    const versions = Array.isArray(policy.document.versions) ? policy.document.versions : [];
    return versions.flatMap((version) => configurationDetails(asRecord(version)?.configurations));
  });
}

function configurationDetails(configurations: unknown): readonly JsonRecord[] {
  if (!Array.isArray(configurations)) return [];
  return configurations
    .map((configuration: unknown) => asRecord(asRecord(configuration)?.details))
    .filter((entry): entry is JsonRecord => entry !== undefined);
}
