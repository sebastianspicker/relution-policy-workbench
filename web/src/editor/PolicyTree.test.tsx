/** Verifies policy-tree labels, selection, and configuration actions. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { APPLE_COMPAT_SETTINGS, createAppleCompatConfiguration, type AppleCompatSetting } from "../../../src/apple-compat.js";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";
import { PolicyTree } from "./PolicyTree.js";

const template: ConfigurationTemplate = {
  type: "IOS_RESTRICTION",
  label: "iOS Restrictions",
  schemaName: "iosRestriction",
  platforms: ["IOS"],
  enrollmentTypes: [],
  multiConfig: false,
  portalHidden: false,
  placeholders: [],
  required: [],
  fields: [],
};

const policy: WorkspacePolicy = {
  path: "policies/fallback-name.json",
  document: {
    versions: [{
      configurations: [
        { details: { type: "IOS_RESTRICTION" } },
        { details: { type: "IOS_RESTRICTION" } },
      ],
    }],
  },
};

describe("PolicyTree", () => {
  it("falls back to path and platform defaults and marks dirty policies", () => {
    render(
      <PolicyTree
        policy={policy}
        policyIndex={2}
        selection={undefined}
        templatesByType={new Map([[template.type, template]])}
        isDirty
        onSelect={vi.fn()}
        onMoveConfiguration={vi.fn()}
        onRemoveConfiguration={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /policies\/fallback-name\.json/i })).toBeTruthy();
    expect(screen.getByText("UNKNOWN")).toBeTruthy();
    expect(screen.getByLabelText(/unsaved changes/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^version 1$/i })).toBeTruthy();
  });

  it("selects versions and configurations and exposes first/last action intent", () => {
    const onSelect = vi.fn();
    const onMoveConfiguration = vi.fn();
    const onRemoveConfiguration = vi.fn();
    render(
      <PolicyTree
        policy={policy}
        policyIndex={2}
        selection={{ policyIndex: 2, versionIndex: 0, configurationIndex: 1 }}
        templatesByType={new Map([[template.type, template]])}
        isDirty={false}
        onSelect={onSelect}
        onMoveConfiguration={onMoveConfiguration}
        onRemoveConfiguration={onRemoveConfiguration}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^version 1$/i }));
    const configurationButtons = screen.getAllByRole("button", { name: /^iOS restrictionsIOS_RESTRICTION$/i });
    const secondConfigurationButton = configurationButtons[1];
    if (secondConfigurationButton === undefined) throw new Error("Second configuration button was not rendered");
    fireEvent.click(secondConfigurationButton);
    expect(onSelect).toHaveBeenNthCalledWith(1, { policyIndex: 2, versionIndex: 0 });
    expect(onSelect).toHaveBeenNthCalledWith(2, { policyIndex: 2, versionIndex: 0, configurationIndex: 1 });

    const moveUp = screen.getAllByRole("button", { name: /move iOS restrictions up/i });
    const moveDown = screen.getAllByRole("button", { name: /move iOS restrictions down/i });
    const remove = screen.getAllByRole("button", { name: /remove iOS restrictions/i });
    const firstMoveUp = moveUp[0];
    const secondMoveUp = moveUp[1];
    const firstMoveDown = moveDown[0];
    const secondMoveDown = moveDown[1];
    const secondRemove = remove[1];
    if (firstMoveUp === undefined || secondMoveUp === undefined || firstMoveDown === undefined || secondMoveDown === undefined || secondRemove === undefined) {
      throw new Error("Configuration action buttons were not rendered");
    }
    expect((firstMoveUp as HTMLButtonElement).disabled).toBe(true);
    expect((secondMoveDown as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(firstMoveDown);
    fireEvent.click(secondMoveUp);
    fireEvent.click(secondRemove);
    expect(onMoveConfiguration).toHaveBeenNthCalledWith(1, { policyIndex: 2, versionIndex: 0, configurationIndex: 0 }, "down");
    expect(onMoveConfiguration).toHaveBeenNthCalledWith(2, { policyIndex: 2, versionIndex: 0, configurationIndex: 1 }, "up");
    expect(onRemoveConfiguration).toHaveBeenCalledWith({ policyIndex: 2, versionIndex: 0, configurationIndex: 1 });
  });

  it("prefers Apple compatibility labels and reports configured controls", () => {
    const appleSetting = createAppleSetting();
    withAppleCompatSetting(appleSetting, () => {
      const appleTemplate = { ...template, type: "APPLE_MOBILECONFIG", label: "Native mobileconfig", fields: [
        templateField("type"), templateField("enabled"), templateField("displayName"), templateField("missing"),
      ] };
      const applePolicy: WorkspacePolicy = {
        ...policy,
        document: { ...policy.document, versions: [{ configurations: [createAppleCompatConfiguration(appleSetting.id, {}, { now: () => 0, uuidFactory: () => "TEST-UUID" })] }] },
      };
      render(
        <PolicyTree
          policy={applePolicy}
          policyIndex={4}
          selection={{ policyIndex: 4, versionIndex: 0, configurationIndex: 0 }}
          templatesByType={new Map([[appleTemplate.type, appleTemplate]])}
          isDirty={false}
          onSelect={vi.fn()}
          onMoveConfiguration={vi.fn()}
          onRemoveConfiguration={vi.fn()}
        />,
      );

      const configuration = screen.getByRole("button", { name: /^Apple Compatibility Profile \*APPLE_MOBILECONFIG/ });
      expect(configuration.className).toContain("active");
      expect(screen.getByText("APPLE_MOBILECONFIG / com.example.compatibility")).toBeTruthy();
      expect(screen.getByText("3 / 4 controls")).toBeTruthy();
      expect(screen.getByText("3", { selector: ".tree-count" })).toBeTruthy();
    });
  });

  it("keeps malformed configurations selectable and forwards their exact action selection", () => {
    const onSelect = vi.fn();
    const onMoveConfiguration = vi.fn();
    const onRemoveConfiguration = vi.fn();
    const malformedPolicy: WorkspacePolicy = {
      ...policy,
      document: { ...policy.document, versions: [{ configurations: [null] }] },
    };
    render(
      <PolicyTree
        policy={malformedPolicy}
        policyIndex={7}
        selection={{ policyIndex: 7, versionIndex: 0, configurationIndex: 0 }}
        templatesByType={new Map()}
        isDirty={false}
        onSelect={onSelect}
        onMoveConfiguration={onMoveConfiguration}
        onRemoveConfiguration={onRemoveConfiguration}
      />,
    );

    const configuration = screen.getByRole("button", { name: /^UNKNOWN$/i });
    expect(configuration.className).toContain("active");
    fireEvent.click(configuration);
    fireEvent.click(screen.getByRole("button", { name: /remove unknown/i }));
    expect(onSelect).toHaveBeenCalledWith({ policyIndex: 7, versionIndex: 0, configurationIndex: 0 });
    expect(onRemoveConfiguration).toHaveBeenCalledWith({ policyIndex: 7, versionIndex: 0, configurationIndex: 0 });
    expect((screen.getByRole("button", { name: /move unknown up/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /move unknown down/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(onMoveConfiguration).not.toHaveBeenCalled();
  });
});

function templateField(path: string): ConfigurationTemplate["fields"][number] {
  return { path, label: path, kind: "string", required: false, nullable: false, enumValues: [], enumLabels: {} };
}

function createAppleSetting(): AppleCompatSetting {
  return {
    id: "policy-tree-compatibility",
    label: "Apple Compatibility Profile",
    payloadType: "com.example.compatibility",
    platforms: ["IOS"],
    status: "mobileconfig-backed",
    jamfFeature: "Test compatibility profile",
    relutionTransportType: "APPLE_MOBILECONFIG",
    description: "",
    sourceUrls: [],
    fields: [],
    builder: "generic-json",
  };
}

function withAppleCompatSetting(setting: AppleCompatSetting, run: () => void): void {
  APPLE_COMPAT_SETTINGS.push(setting);
  try {
    run();
  } finally {
    const index = APPLE_COMPAT_SETTINGS.findIndex((candidate) => candidate.id === setting.id);
    if (index >= 0) APPLE_COMPAT_SETTINGS.splice(index, 1);
  }
}
