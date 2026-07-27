/** Presents the selected policy configuration and delegates its specialized editor surface. */
import { useState, type JSX } from "react";
import { ConfigurationPickerModal } from "./ConfigurationPickerModal.js";
import { EditorBreadcrumb } from "./EditorBreadcrumb.js";
import { EditorConfiguration, getEditorVersionName } from "./editor-shell-configuration.js";
import type { EditorController } from "./types.js";

export function EditorWorkspace({ controller }: { readonly controller: EditorController }): JSX.Element {
  const [pickerOpen, setPickerOpen] = useState(false);
  const versionName = getEditorVersionName(controller);

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

  if (controller.selection === undefined) return <EditorWelcome />;

  return controller.configuration === undefined ? (
    <>
      <EditorBreadcrumb policy={controller.policy} versionName={versionName} />
      <EditorConfiguration.Empty controller={controller} pickerModal={pickerModal} onOpenPicker={() => setPickerOpen(true)} />
    </>
  ) : (
    <>
      <EditorBreadcrumb policy={controller.policy} versionName={versionName} />
      <EditorConfiguration.Selected controller={controller} pickerModal={pickerModal} onOpenPicker={() => setPickerOpen(true)} />
    </>
  );
}

function EditorWelcome(): JSX.Element {
  return (
    <article className="editor-welcome">
      <h1>Select a policy to start editing</h1>
      <p>Pick a policy version from the sidebar or create a new one to begin adding configurations.</p>
      <ol className="welcome-steps">
        <li><strong>Select or create a policy.</strong> Choose a version in Navigation or create a platform policy.</li>
        <li><strong>Add configurations.</strong> Use Relution-native settings, Apple payloads, schema profiles, or sidecar artifacts.</li>
        <li><strong>Review evidence and validation.</strong> Apply a baseline, inspect compatibility limits, and resolve errors.</li>
        <li><strong>Save, build, and download.</strong> Set an archive passphrase when required, then produce the local <code>.rexp</code> archive.</li>
      </ol>
    </article>
  );
}
