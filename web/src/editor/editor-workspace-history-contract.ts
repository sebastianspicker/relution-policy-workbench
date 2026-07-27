/** State contract for undo, redo, and workspace clearing actions. */
import type { Dispatch, SetStateAction } from "react";
import type { PolicyWorkspace } from "../../../src/workspace.js";
import type { WorkspaceRequestGuard } from "./editor-workspace-request-guard.js";
import type { AppState, Selection } from "./types.js";
import type { WorkspaceHistoryEntry } from "./useEditorControllerActionTypes.js";

type SetHistoryStack = (
  entries: readonly WorkspaceHistoryEntry[]
    | ((current: readonly WorkspaceHistoryEntry[]) => readonly WorkspaceHistoryEntry[]),
) => void;

export interface WorkspaceHistoryActionsInput {
  readonly currentWorkspace: PolicyWorkspace;
  readonly isDirty: boolean;
  readonly selection: Selection | undefined;
  readonly undoStack: readonly WorkspaceHistoryEntry[];
  readonly redoStack: readonly WorkspaceHistoryEntry[];
  readonly requestGuard: WorkspaceRequestGuard;
  readonly pushUndoState: () => void;
  readonly setState: Dispatch<SetStateAction<AppState | undefined>>;
  readonly setSelection: (selection: Selection | undefined) => void;
  readonly setIsDirty: (value: boolean) => void;
  readonly setHasFreshBuild: (value: boolean) => void;
  readonly setUndoStack: SetHistoryStack;
  readonly setRedoStack: SetHistoryStack;
  readonly setActionSuccessStatus: (message: string) => void;
  readonly setActionErrorStatus: (message: string) => void;
}
