/** Renders workspace history, persistence, build, download, and inspector actions. */
import type { JSX } from "react";
import { IconInspector, IconRedo, IconUndo } from "./icons.js";
import type { EditorController } from "./types.js";
import { downloadOutputArchive, reportDownloadError } from "./workspace-toolbar-actions.js";

export function WorkspaceToolbarPrimaryActions(props: {
  readonly controller: EditorController;
  readonly inspectorAvailable?: boolean | undefined;
  readonly inspectorPinned: boolean;
  readonly onToggleInspector: () => void;
}): JSX.Element {
  const c = props.controller;

  return (
    <div className="toolbar-primary">
      <button
        type="button"
        className="toolbar-icon-btn"
        disabled={!c.canUndo}
        onClick={c.undoWorkspace}
        title="Undo (⌘Z)"
        aria-label="Undo"
      >
        <IconUndo />
      </button>
      <button
        type="button"
        className="toolbar-icon-btn"
        disabled={!c.canRedo}
        onClick={c.redoWorkspace}
        title="Redo (⇧⌘Z)"
        aria-label="Redo"
      >
        <IconRedo />
      </button>
      <div className="toolbar-separator" aria-hidden="true" />
      {c.isDirty ? (
        <span className="toolbar-status" aria-label="Unsaved changes" role="status">
          <span className="dirty-dot" aria-hidden="true" />
          Unsaved changes
        </span>
      ) : null}
      <button
        type="button"
        disabled={!c.isDirty}
        className="btn-save"
        onClick={() => void c.saveWorkspace()}
        title="Save changes"
      >
        Save
      </button>
      <div className="toolbar-separator" aria-hidden="true" />
      <button
        type="button"
        className="btn-primary btn-build"
        onClick={() => void c.buildArchive()}
        disabled={c.isBuildLoading}
        title="Build .rexp (⌘B)"
      >
        {c.isBuildLoading ? <span className="loading-spinner" aria-hidden="true" /> : null}
        Build archive
      </button>
      {c.hasFreshBuild ? (
        <button type="button" className="button-link" onClick={() => void downloadOutputArchive().catch((error) => reportDownloadError(error, c.setStatus))}>
          Download
        </button>
      ) : (
        <>
          <button type="button" disabled aria-describedby="download-disabled-reason">
            Download
          </button>
          <span id="download-disabled-reason" className="visually-hidden">
            Create a fresh .rexp archive before downloading.
          </span>
        </>
      )}
      {props.inspectorAvailable !== false ? (
        <>
          <div className="toolbar-separator" aria-hidden="true" />
          <button
            type="button"
            className="toolbar-icon-btn"
            onClick={props.onToggleInspector}
            aria-pressed={props.inspectorPinned}
            title={props.inspectorPinned ? "Hide inspector (⌘I)" : "Show inspector (⌘I)"}
            aria-label="Toggle inspector panel"
          >
            <IconInspector />
          </button>
        </>
      ) : null}
    </div>
  );
}
