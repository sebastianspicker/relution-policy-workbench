/** Verifies policy-tree labels, selection, and configuration actions. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
