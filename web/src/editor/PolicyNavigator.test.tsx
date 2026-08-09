/** Verifies policy search and selection retain the expected workspace navigation contract. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";
import { PolicyNavigator, policyMatches } from "./PolicyNavigator.js";

describe("PolicyNavigator", () => {
  it("matches policies by visible configuration metadata", () => {
    const templatesByType = new Map([[template.type, template]]);

    expect(policyMatches(policy, "iOS Restrictions", templatesByType)).toBe(true);
    expect(policyMatches(policy, "com.apple.applicationaccess", templatesByType)).toBe(true);
    expect(policyMatches(policy, "Release baseline", templatesByType)).toBe(true);
    expect(policyMatches(policy, "unrelated setting", templatesByType)).toBe(false);
  });

  it("filters by configuration metadata and exposes an empty search result", () => {
    render(
      <PolicyNavigator
        policies={[policy]}
        selection={undefined}
        templatesByType={new Map([[template.type, template]])}
        newPolicyName=""
        newPolicyPlatform="IOS"
        creatablePlatforms={["IOS", "ANDROID", "MACOS", "WINDOWS"]}
        isDirty={false}
        onSelect={vi.fn()}
        onMoveConfiguration={vi.fn()}
        onRemoveConfiguration={vi.fn()}
        onNewPolicyNameChange={vi.fn()}
        onNewPolicyPlatformChange={vi.fn()}
        onCreatePolicy={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /^Policies$/i })).toBeTruthy();

    const search = screen.getByLabelText(/search policies/i);
    fireEvent.change(search, { target: { value: "iOS Restrictions" } });
    expect(screen.getByRole("heading", { name: /mobile baseline/i })).toBeTruthy();

    fireEvent.change(search, { target: { value: "does not exist" } });
    expect(screen.getByText(/no policies match the search/i)).toBeTruthy();
  });

  it("opens, cancels, and creates a policy while forwarding its name and platform", () => {
    const onNewPolicyNameChange = vi.fn();
    const onNewPolicyPlatformChange = vi.fn();
    const onCreatePolicy = vi.fn();
    render(
      <PolicyNavigator
        policies={[policy]}
        selection={undefined}
        templatesByType={new Map([[template.type, template]])}
        newPolicyName=""
        newPolicyPlatform="IOS"
        creatablePlatforms={["IOS", "ANDROID"]}
        isDirty={false}
        onSelect={vi.fn()}
        onMoveConfiguration={vi.fn()}
        onRemoveConfiguration={vi.fn()}
        onNewPolicyNameChange={onNewPolicyNameChange}
        onNewPolicyPlatformChange={onNewPolicyPlatformChange}
        onCreatePolicy={onCreatePolicy}
      />,
    );

    const newPolicy = screen.getByRole("button", { name: /new policy/i });
    expect(newPolicy.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(newPolicy);
    expect(newPolicy.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByLabelText(/new policy name/i), { target: { value: "Android baseline" } });
    fireEvent.change(screen.getByLabelText(/new policy platform/i), { target: { value: "ANDROID" } });
    expect(onNewPolicyNameChange).toHaveBeenCalledWith("Android baseline");
    expect(onNewPolicyPlatformChange).toHaveBeenCalledWith("ANDROID");

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(newPolicy.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(newPolicy);
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    expect(onCreatePolicy).toHaveBeenCalledTimes(1);
    expect(newPolicy.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the create form for an empty workspace and selects tree items", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PolicyNavigator
        policies={[]}
        selection={undefined}
        templatesByType={new Map()}
        newPolicyName="New policy"
        newPolicyPlatform="IOS"
        creatablePlatforms={["IOS"]}
        isDirty={false}
        onSelect={onSelect}
        onMoveConfiguration={vi.fn()}
        onRemoveConfiguration={vi.fn()}
        onNewPolicyNameChange={vi.fn()}
        onNewPolicyPlatformChange={vi.fn()}
        onCreatePolicy={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/new policy name/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /new policy/i }).getAttribute("aria-expanded")).toBe("true");

    rerender(
      <PolicyNavigator
        policies={[policy]}
        selection={undefined}
        templatesByType={new Map([[template.type, template]])}
        newPolicyName=""
        newPolicyPlatform="IOS"
        creatablePlatforms={["IOS"]}
        isDirty={false}
        onSelect={onSelect}
        onMoveConfiguration={vi.fn()}
        onRemoveConfiguration={vi.fn()}
        onNewPolicyNameChange={vi.fn()}
        onNewPolicyPlatformChange={vi.fn()}
        onCreatePolicy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^release baseline$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^iOS restrictionsIOS_RESTRICTION$/i }));
    expect(onSelect).toHaveBeenNthCalledWith(1, { policyIndex: 0, versionIndex: 0 });
    expect(onSelect).toHaveBeenNthCalledWith(2, { policyIndex: 0, versionIndex: 0, configurationIndex: 0 });
  });
});

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
  path: "policies/policy_mobile_baseline.json",
  document: {
    name: "Mobile baseline",
    platform: "IOS",
    versions: [
      {
        name: "Release baseline",
        configurations: [
          {
            details: {
              type: "IOS_RESTRICTION",
              displayName: "Restrictions",
              secondLevelPayloadType: "com.apple.applicationaccess",
            },
          },
        ],
      },
    ],
  },
};
