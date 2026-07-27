/** Derives Apple compatibility and schema choices for the selected policy. */
import { useMemo } from "react";
import { appleCompatSettingsForPlatform, findAppleCompatSettingForDetails } from "../../../src/apple-compat.js";
import { appleSchemaEntriesForPlatform, findAppleSchemaProfileForDetails, type AppleSchemaEntry } from "../../../src/apple-schema.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";
import { emptyAppleSchemaCatalog } from "./editor-utils.js";
import type { AppState, JsonRecord } from "./types.js";

const DDM_ENTRY_KINDS = new Set<AppleSchemaEntry["kind"]>([
  "ddm-configuration",
  "ddm-asset",
  "ddm-activation",
  "ddm-management",
]);

/** Returns Apple catalog entries applicable to the selected policy. */
export function useEditorWorkspaceAppleCatalog(props: {
  readonly state: AppState | undefined;
  readonly policy: WorkspacePolicy | undefined;
  readonly selectedPolicyPlatform: string;
  readonly details: JsonRecord | undefined;
}) {
  const appleCompatSetting = findAppleCompatSettingForDetails(props.details);
  const appleSchemaProfile = findAppleSchemaProfileForDetails(props.state?.appleSchema ?? emptyAppleSchemaCatalog(), props.details);
  const availableAppleCompatSettings = useMemo(
    () => props.policy === undefined ? [] : appleCompatSettingsForPlatform(props.selectedPolicyPlatform),
    [props.policy, props.selectedPolicyPlatform],
  );
  const availableAppleSchemaProfiles = useMemo(
    () => props.policy === undefined || props.state === undefined
      ? []
      : appleSchemaEntriesForPlatform(props.state.appleSchema, props.selectedPolicyPlatform, "profile"),
    [props.policy, props.selectedPolicyPlatform, props.state],
  );
  const availableDdmEntries = useMemo(
    () => (props.state?.appleSchema.entries ?? []).filter((entry) => DDM_ENTRY_KINDS.has(entry.kind)),
    [props.state],
  );
  const availableMdmCommands = useMemo(
    () => (props.state?.appleSchema.entries ?? []).filter((entry) => entry.kind === "mdm-command"),
    [props.state],
  );

  return {
    appleCompatSetting,
    appleSchemaProfile,
    availableAppleCompatSettings,
    availableAppleSchemaProfiles,
    availableDdmEntries,
    availableMdmCommands,
  };
}
