/** Provides workspace-level save, history, import, and build actions with guarded availability. */
import type { JSX } from "react";
import { IconInspector, IconRedo, IconUndo } from "./icons.js";
import type { AppSection } from "./SectionRoute.js";
import type { EditorController } from "./types.js";
import { downloadOutputArchive, reportDownloadError, workspaceContext } from "./workspace-toolbar-actions.js";

export function WorkspaceToolbar(props: {
  readonly appSection?: AppSection;
  readonly controller: EditorController;
  readonly inspectorAvailable?: boolean;
  readonly inspectorPinned: boolean;
  readonly onToggleInspector: () => void;
}): JSX.Element {
  const c = props.controller;
  const context = workspaceContext(props.appSection ?? "policies", c);

  return (
    <header className="toolbar">
      <div className="toolbar-main">
        <div className="toolbar-product">
          <span className="toolbar-product-name">REXP Studio</span>
          <span className="toolbar-product-version">v0.1.0</span>
        </div>
        <nav className="toolbar-context" aria-label="Workspace context">
          {context.map((segment, index) => (
            <span className={index === context.length - 1 ? "toolbar-context-segment toolbar-context-segment--current" : "toolbar-context-segment"} key={`${segment}-${index}`}>
              {index > 0 ? <span className="toolbar-context-separator" aria-hidden="true">/</span> : null}
              {segment}
            </span>
          ))}
        </nav>
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
      </div>
    </header>
  );
}
