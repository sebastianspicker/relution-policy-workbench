/** Arranges editor navigation, workspace panes, and modal flows around the controller contract. */
import { useState, type JSX } from "react";
import { AppNavigation } from "./AppNavigation.js";
import { BaselinePanel } from "./BaselinePanel.js";
import { useEditorShellShortcuts } from "./editor-shell-shortcuts.js";
import { readInspectorPinned, usePersistedInspectorPinned } from "./editor-shell-state.js";
import { useEditorShellRoute } from "./editor-shell-routes.js";
import { EditorWorkspace } from "./editor-shell-workspace.js";
import { PolicyWorkspaceLayout } from "./PolicyWorkspaceLayout.js";
import { ProvenanceStrip } from "./ProvenanceStrip.js";
import { RelutionDashboardPanel } from "./RelutionDashboardPanel.js";
import { SectionViewport } from "./SectionViewport.js";
import { SettingsPanel } from "./SettingsPanel.js";
import type { CorporateTheme } from "./theme.js";
import type { EditorController } from "./types.js";
import { WorkspaceToolbar } from "./WorkspaceToolbar.js";

type EditorShellProps = {
  readonly controller: EditorController;
  readonly theme: CorporateTheme;
  readonly onThemeChange: (theme: CorporateTheme) => void;
};

export function EditorShell({ controller, theme, onThemeChange }: EditorShellProps): JSX.Element {
  const [compactPane, setCompactPane] = useState<"editor" | "navigation" | "inspector">("editor");
  const [inspectorPinned, setInspectorPinned] = useState(readInspectorPinned);
  const { appSection, baselineTab, navigate } = useEditorShellRoute(setCompactPane);

  usePersistedInspectorPinned(inspectorPinned);
  useEditorShellShortcuts({ appSection, controller, onToggleInspector: () => setInspectorPinned((pinned) => !pinned) });

  return (
    <div className="editor-root" data-theme={theme}>
      <AppNavigation section={appSection} onNavigate={navigate} />
      <WorkspaceToolbar
        appSection={appSection}
        controller={controller}
        inspectorPinned={inspectorPinned}
        inspectorAvailable={appSection === "policies"}
        onToggleInspector={() => setInspectorPinned((pinned) => !pinned)}
      />
      <ProvenanceStrip appSection={appSection} controller={controller} />
      <main id="main-content" className="workbench-layout" tabIndex={-1}>
        {appSection === "policies" ? (
          <PolicyWorkspaceLayout compactPane={compactPane} controller={controller} inspectorPinned={inspectorPinned} onCompactPaneChange={setCompactPane}>
            <EditorWorkspace controller={controller} />
          </PolicyWorkspaceLayout>
        ) : appSection === "baselines" ? (
          <SectionViewport section="baselines">
            <BaselinePanel controller={controller} activeTab={baselineTab} onTabChange={(tab) => navigate(`baselines/${tab === "wizard" ? "builder" : tab}`)} />
          </SectionViewport>
        ) : appSection === "device-audit" ? (
          <SectionViewport section="device-audit"><RelutionDashboardPanel /></SectionViewport>
        ) : (
          <SectionViewport section="settings"><SettingsPanel controller={controller} theme={theme} onThemeChange={onThemeChange} /></SectionViewport>
        )}
      </main>
    </div>
  );
}
