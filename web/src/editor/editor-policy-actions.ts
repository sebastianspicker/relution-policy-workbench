/** Composes policy-document and selected-configuration editing actions. */
import type { WorkspacePolicy } from "../../../src/workspace.js";
import type { JsonRecord, Selection } from "./types.js";
import { cloneWorkspace } from "./editor-utils.js";
import { createConfigurationEditingActions } from "./editor-configuration-edit-actions.js";
import { createPolicyDocumentActions } from "./editor-policy-document-actions.js";

type MarkWorkspaceDirty = (
  workspace: ReturnType<typeof cloneWorkspace>,
  selection: Selection | undefined,
  message: string,
) => boolean;

export interface PolicyEditingActionsInput {
  readonly currentState: { readonly workspace: Parameters<MarkWorkspaceDirty>[0] };
  readonly selection: Selection | undefined;
  readonly policy: WorkspacePolicy | undefined;
  readonly configuration: JsonRecord | undefined;
  readonly rawJson: string;
  readonly canonicalRawJson: string;
  readonly markWorkspaceDirty: MarkWorkspaceDirty;
  readonly setRawJsonState: (value: string) => void;
  readonly setRawJsonDirty: (value: boolean) => void;
  readonly setActionErrorStatus: (message: string) => void;
  readonly setActionSuccessStatus: (message: string) => void;
}

export function createPolicyEditingActions(input: PolicyEditingActionsInput):
  ReturnType<typeof createPolicyDocumentActions> & ReturnType<typeof createConfigurationEditingActions> {
  return {
    ...createPolicyDocumentActions(input),
    ...createConfigurationEditingActions(input),
  };
}
