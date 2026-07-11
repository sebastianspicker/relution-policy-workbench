import { useEffect, useState, type JSX } from "react";
import { APPLE_COMPAT_HINT } from "../../../src/apple-compat.js";
import { BaselinePanel, type BaselineTab } from "./BaselinePanel.js";
import { ConfigurationInspector } from "./ConfigurationInspector.js";
import { ConfigurationPickerModal } from "./ConfigurationPickerModal.js";
import { EditorBreadcrumb } from "./EditorBreadcrumb.js";
import { asRecord } from "./editor-utils.js";
import { AppleCompatFields } from "./fields/AppleCompatFields.js";
import { AppleSchemaFields } from "./fields/AppleSchemaFields.js";
import { GeneratedFields } from "./fields/GeneratedFields.js";
import { InfoButton } from "./fields/InfoButton.js";
import { IconBaseline, IconDashboard, IconPolicies, IconSettings } from "./icons.js";
import { JsonTemplateImportControl } from "./JsonTemplateImportControl.js";
import { MobileConfigFields } from "./fields/MobileConfigFields.js";
import { PolicyNavigator } from "./PolicyNavigator.js";
import { RelutionDashboardPanel } from "./RelutionDashboardPanel.js";
import { SettingsPanel } from "./SettingsPanel.js";
import { navigateToSectionRoute, replaceWithCanonicalRoute, routeFromHash, type SectionRoute } from "./SectionRoute.js";
import type { CorporateTheme } from "./theme.js";
import type { EditorController } from "./types.js";
import { WorkspaceToolbar } from "./WorkspaceToolbar.js";

const INSPECTOR_PINNED_STORAGE_NAME = "relution-editor-inspector-pinned";

function readInspectorPinned(): boolean {
  try {
    const stored = window.localStorage.getItem(INSPECTOR_PINNED_STORAGE_NAME);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

type AppSection = "policies" | "baseline" | "dashboard" | "settings";
export type CompactPane = "editor" | "navigation" | "inspector";

const APP_SECTIONS = [
  { id: "policies", label: "Policies", Icon: IconPolicies },
  { id: "baselines/builder", label: "Baselines", Icon: IconBaseline },
  { id: "device-audit", label: "Device audit", Icon: IconDashboard },
  { id: "settings", label: "Settings", Icon: IconSettings },
] as const satisfies readonly { readonly id: SectionRoute; readonly label: string; readonly Icon: (props: { size?: number }) => JSX.Element }[];

type EditorShellProps = {
  readonly controller: EditorController;
  readonly theme: CorporateTheme;
  readonly onThemeChange: (theme: CorporateTheme) => void;
};

export function EditorShell({ controller, theme, onThemeChange }: EditorShellProps): JSX.Element {
  const [route, setRoute] = useState<SectionRoute>(() => readInitialRoute());
  const [compactPane, setCompactPane] = useState<CompactPane>("editor");
  const [inspectorPinned, setInspectorPinned] = useState(() =>
    typeof window !== "undefined" ? readInspectorPinned() : true,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(INSPECTOR_PINNED_STORAGE_NAME, String(inspectorPinned));
    } catch {
      // ignore
    }
  }, [inspectorPinned]);

  useEffect(() => {
    function syncRouteFromHash(): void {
      const resolved = routeFromHash(window.location.hash);
      if (!resolved.canonical) replaceWithCanonicalRoute(resolved.route);
      setRoute(resolved.route);
      setCompactPane("editor");
    }
    window.addEventListener("hashchange", syncRouteFromHash);
    window.addEventListener("popstate", syncRouteFromHash);
    return () => {
      window.removeEventListener("hashchange", syncRouteFromHash);
      window.removeEventListener("popstate", syncRouteFromHash);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key === "s") {
        event.preventDefault();
        void controller.saveWorkspace();
      } else if (isEditableTarget(event.target)) {
        return;
      } else if (event.key === "b") {
        event.preventDefault();
        void controller.buildArchive();
      } else if (event.key === "i") {
        event.preventDefault();
        setInspectorPinned((prev) => !prev);
      } else if (event.key === "z" && event.shiftKey) {
        event.preventDefault();
        controller.redoWorkspace();
      } else if (event.key === "z") {
        event.preventDefault();
        controller.undoWorkspace();
      } else if (event.key === "y") {
        event.preventDefault();
        controller.redoWorkspace();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [controller]);

  const appSection = sectionForRoute(route);
  const baselineTab = baselineTabForRoute(route);
  const workspaceClassName = `workspace-grid compact-pane-${compactPane}${inspectorPinned ? " inspector-pinned" : ""}`;

  function setRouteFromNavigation(nextRoute: SectionRoute): void {
    navigateToSectionRoute(nextRoute);
    setRoute(nextRoute);
    setCompactPane("editor");
  }

  return (
    <main className="editor-root" data-theme={theme}>
      <WorkspaceToolbar
        controller={controller}
        inspectorPinned={inspectorPinned}
        onToggleInspector={() => setInspectorPinned((prev) => !prev)}
      />

      <nav className="mobile-section-controls" aria-label="App sections">
        {APP_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-current={appSection === sectionForRoute(section.id) ? "page" : undefined}
            onClick={() => setRouteFromNavigation(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {appSection === "policies" ? (
        <nav className="mobile-pane-controls" aria-label="Workspace panes">
          <button
            type="button"
            aria-pressed={compactPane === "editor"}
            onClick={() => setCompactPane("editor")}
          >
            Editor
          </button>
          <button
            type="button"
            aria-controls="editor-navigation-pane"
            aria-pressed={compactPane === "navigation"}
            onClick={() => setCompactPane("navigation")}
          >
            Navigation
          </button>
          <button
            type="button"
            aria-controls="editor-inspector-pane"
            aria-pressed={compactPane === "inspector"}
            onClick={() => setCompactPane("inspector")}
          >
            Inspector
          </button>
        </nav>
      ) : null}

      <section className={workspaceClassName}>
        <AppRail section={appSection} onChange={setRouteFromNavigation} />

        <aside id="editor-navigation-pane" className="sidebar">
          <PolicyNavigator
            policies={controller.state.workspace.policies}
            selection={controller.selection}
            templatesByType={controller.templatesByType}
            newPolicyName={controller.newPolicyName}
            newPolicyPlatform={controller.newPolicyPlatform}
            creatablePlatforms={controller.creatablePlatforms}
            isDirty={controller.isDirty}
            onSelect={controller.setSelection}
            onMoveConfiguration={(targetSelection, direction) => void controller.moveConfiguration(targetSelection, direction)}
            onRemoveConfiguration={(targetSelection) => void controller.removeConfiguration(targetSelection)}
            onNewPolicyNameChange={controller.setNewPolicyName}
            onNewPolicyPlatformChange={controller.setNewPolicyPlatform}
            onCreatePolicy={() => void controller.addPolicy()}
          />
        </aside>

        <section className="editor-panel">
          {appSection === "baseline" ? (
            <div className="center-section">
              <BaselinePanel controller={controller} activeTab={baselineTab} onTabChange={(tab) => setRouteFromNavigation(`baselines/${tab === "wizard" ? "builder" : tab}`)} />
            </div>
          ) : appSection === "dashboard" ? (
            <div className="center-section center-section--wide">
              <RelutionDashboardPanel />
            </div>
          ) : appSection === "settings" ? (
            <div className="center-section center-section--narrow">
              <SettingsPanel controller={controller} theme={theme} onThemeChange={onThemeChange} />
            </div>
          ) : controller.selection === undefined ? (
            <EditorWelcome />
          ) : (
            <EditorWorkspace controller={controller} />
          )}
        </section>

        <ConfigurationInspector controller={controller} id="editor-inspector-pane" />
      </section>
    </main>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/u.test(target.tagName));
}

function readInitialRoute(): SectionRoute {
  const resolved = routeFromHash(window.location.hash);
  if (!resolved.canonical) replaceWithCanonicalRoute(resolved.route);
  return resolved.route;
}

function sectionForRoute(route: SectionRoute): AppSection {
  switch (route) {
    case "baselines/builder":
    case "baselines/recommendations":
    case "baselines/compliance":
      return "baseline";
    case "device-audit":
      return "dashboard";
    default:
      return route;
  }
}

function baselineTabForRoute(route: SectionRoute): BaselineTab {
  if (route === "baselines/recommendations") return "recommendations";
  if (route === "baselines/compliance") return "compliance";
  return "wizard";
}

function AppRail({
  section,
  onChange,
}: {
  readonly section: AppSection;
  readonly onChange: (s: SectionRoute) => void;
}): JSX.Element {
  return (
    <nav className="app-rail" aria-label="App sections">
      {APP_SECTIONS.map((appSection) => (
        <button
          key={appSection.id}
          type="button"
          className="app-rail-btn"
          aria-current={section === sectionForRoute(appSection.id) ? "page" : undefined}
          title={appSection.label}
          onClick={() => onChange(appSection.id)}
        >
          <span className="app-rail-icon" aria-hidden="true">
            <appSection.Icon size={20} />
          </span>
          <span className="app-rail-label">{appSection.label}</span>
        </button>
      ))}
    </nav>
  );
}

function EditorWorkspace({ controller }: { readonly controller: EditorController }): JSX.Element {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasConfig = controller.configuration !== undefined;
  const versionName = getVersionName(controller);

  function openPicker(): void {
    setPickerOpen(true);
  }
  function closePicker(): void {
    setPickerOpen(false);
  }

  const pickerModal = pickerOpen ? (
    <ConfigurationPickerModal
      availableTemplates={controller.availableTemplates}
      presentNativeTypes={controller.presentNativeTypes}
      availableAppleCompatSettings={controller.availableAppleCompatSettings}
      availableAppleSchemaProfiles={controller.availableAppleSchemaProfiles}
      customSettingsAvailable={controller.policy?.document.platform === "MACOS"}
      selectedType={controller.selectedType}
      query={controller.addQuery}
      group={controller.addGroup}
      onSelectedTypeChange={controller.setSelectedType}
      onQueryChange={controller.setAddQuery}
      onGroupChange={controller.setAddGroup}
      onAdd={() => {
        void controller.addConfiguration();
        closePicker();
      }}
      onClose={closePicker}
    />
  ) : null;

  if (!hasConfig) {
    return <PolicyWithoutConfiguration controller={controller} pickerModal={pickerModal} versionName={versionName} onOpenPicker={openPicker} />;
  }

  const header = configurationHeader(controller);
  return (
    <>
      <EditorBreadcrumb
        policy={controller.policy}
        versionName={versionName}
      />
      <div className="panel-header">
        <div>
          <h1>{header.title}</h1>
          <p>
            {header.description}
            {controller.appleCompatSetting !== undefined ? (
              <InfoButton label={controller.appleCompatSetting.label} description={APPLE_COMPAT_HINT} source="Relution APPLE_MOBILECONFIG" />
            ) : controller.template?.description !== undefined ? (
              <InfoButton label={controller.template.label} description={controller.template.description} source={controller.template.descriptionSource} />
            ) : null}
          </p>
        </div>
        <div className="configuration-tools">
          <button type="button" className="btn-add-configuration" onClick={openPicker}>
            + Add configuration
          </button>
          <JsonTemplateImportControl
            label="Apply JSON"
            ariaLabel="Selected setting JSON file"
            disabled={controller.configuration === undefined}
            onFileChange={controller.setJsonTemplateFile}
            onImport={() => void controller.importJsonTemplates()}
          />
        </div>
      </div>
      {pickerModal}
      <div className="editor-content">
        <EditorFields controller={controller} />
      </div>
    </>
  );
}

function PolicyWithoutConfiguration(props: {
  readonly controller: EditorController;
  readonly pickerModal: JSX.Element | null;
  readonly versionName: string | undefined;
  readonly onOpenPicker: () => void;
}): JSX.Element {
  const identity = policyIdentity(props.controller);
  return (
    <>
      <EditorBreadcrumb policy={props.controller.policy} versionName={props.versionName} />
      <div className="policy-version-context">
        <div className="pvc-identity">
          <div className="pvc-meta">
            <span className="pvc-platform">{identity.platform}</span>
          </div>
          <input
            className="pvc-name"
            aria-label="Policy name"
            value={identity.name}
            onChange={(event) => props.controller.renameSelectedPolicy(event.target.value)}
          />
          <textarea
            className="pvc-description"
            aria-label="Policy description"
            placeholder="Add a description…"
            value={identity.description}
            onChange={(event) => props.controller.updateSelectedPolicyDescription(event.target.value)}
          />
        </div>
        <div className="pvc-actions">
          <button type="button" onClick={props.controller.duplicateSelectedPolicy}>
            Duplicate
          </button>
          <button type="button" className="btn-danger" onClick={props.controller.deleteSelectedPolicy}>
            Delete
          </button>
        </div>
      </div>
      <div className="panel-header">
        <div>
          <h1>Configurations</h1>
          <p>Add or import configurations for this policy version.</p>
        </div>
        <div className="configuration-tools">
          <button type="button" className="btn-add-configuration" onClick={props.onOpenPicker}>
            + Add configuration
          </button>
        </div>
      </div>
      {props.pickerModal}
    </>
  );
}

function policyIdentity(controller: EditorController): {
  readonly description: string;
  readonly name: string;
  readonly platform: string;
} {
  return {
    description: typeof controller.policy?.document.description === "string" ? controller.policy.document.description : "",
    name: typeof controller.policy?.document.name === "string" ? controller.policy.document.name : "",
    platform: typeof controller.policy?.document.platform === "string" ? controller.policy.document.platform : "",
  };
}

function configurationHeader(controller: EditorController): {
  readonly description: string;
  readonly title: string;
} {
  if (controller.appleCompatSetting !== undefined) {
    return {
      description: `APPLE_MOBILECONFIG | ${controller.appleCompatSetting.payloadType}`,
      title: `${controller.appleCompatSetting.label} *`,
    };
  }
  if (controller.appleSchemaProfile !== undefined) {
    return {
      description: `APPLE_MOBILECONFIG | ${controller.appleSchemaProfile.identifier} | Apple schema ${controller.state.appleSchema.source.revision}`,
      title: `${controller.appleSchemaProfile.title} *`,
    };
  }
  if (controller.template === undefined) {
    return { description: "Select or add a configuration.", title: "Configuration" };
  }
  return {
    description: `${controller.template.type} | ${controller.template.schemaName} | ${controller.template.multiConfig ? "multi" : "single"}`,
    title: controller.template.label,
  };
}

function EditorFields({ controller }: { readonly controller: EditorController }): JSX.Element {
  if (controller.configuration !== undefined && controller.details !== undefined && controller.appleCompatSetting !== undefined) {
    return (
      <AppleCompatFields
        setting={controller.appleCompatSetting}
        details={controller.details}
        onError={controller.setStatus}
        onChange={(nextDetails) => controller.updateSelectedConfiguration({ ...controller.configuration, details: nextDetails })}
      />
    );
  }
  if (controller.configuration !== undefined && controller.details !== undefined && controller.appleSchemaProfile !== undefined) {
    return (
      <AppleSchemaFields
        entry={controller.appleSchemaProfile}
        details={controller.details}
        onError={controller.setStatus}
        onChange={(nextDetails) => controller.updateSelectedConfiguration({ ...controller.configuration, details: nextDetails })}
      />
    );
  }
  if (controller.configuration !== undefined && controller.details !== undefined && controller.details.type === "APPLE_MOBILECONFIG") {
    return (
      <MobileConfigFields
        details={controller.details}
        onError={controller.setStatus}
        onChange={(nextDetails) => controller.updateSelectedConfiguration({ ...controller.configuration, details: nextDetails })}
      />
    );
  }
  if (controller.configuration !== undefined && controller.details !== undefined && controller.template !== undefined) {
    return <GeneratedFields template={controller.template} details={controller.details} onChange={(nextDetails) => controller.updateSelectedConfiguration({ ...controller.configuration, details: nextDetails })} />;
  }
  return <div className="empty-state">No editable configuration selected.</div>;
}

function EditorWelcome(): JSX.Element {
  return (
    <article className="editor-welcome">
      <h1>Select a policy to start editing</h1>
      <p>
        Pick a policy version from the sidebar or create a new one to begin adding configurations.
      </p>
      <ol className="welcome-steps">
        <li><strong>Select or create a policy.</strong> Choose a version in Navigation or create a platform policy.</li>
        <li><strong>Add configurations.</strong> Use Relution-native settings, Apple payloads, schema profiles, or sidecar artifacts.</li>
        <li><strong>Review evidence and validation.</strong> Apply a baseline, inspect compatibility limits, and resolve errors.</li>
        <li><strong>Save, build, and download.</strong> Set an encryption key when required, then produce the local <code>.rexp</code> archive.</li>
      </ol>
    </article>
  );
}

function getVersionName(controller: EditorController): string | undefined {
  if (controller.selection === undefined || controller.policy === undefined) {
    return undefined;
  }
  const versions = Array.isArray(controller.policy.document.versions) ? controller.policy.document.versions : [];
  const version = asRecord(versions[controller.selection.versionIndex]);
  if (typeof version?.name === "string" && version.name.length > 0) {
    return version.name;
  }
  return `Version ${controller.selection.versionIndex + 1}`;
}
