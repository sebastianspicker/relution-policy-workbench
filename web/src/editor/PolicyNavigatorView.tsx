/** Renders the policy-navigation controls and filtered policy tree. */
import type { JSX } from "react";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";
import { PolicyNavigatorCreate } from "./PolicyNavigatorCreate.js";
import { PolicyTree } from "./PolicyTree.js";
import type { Selection } from "./types.js";
import type { IndexedWorkspacePolicy } from "./usePolicyNavigatorState.js";

export function PolicyNavigatorView(props: {
  readonly policies: readonly WorkspacePolicy[];
  readonly selection: Selection | undefined;
  readonly templatesByType: ReadonlyMap<string, ConfigurationTemplate>;
  readonly newPolicyName: string;
  readonly newPolicyPlatform: string;
  readonly creatablePlatforms: readonly string[];
  readonly isDirty: boolean;
  readonly query: string;
  readonly showCreate: boolean;
  readonly visiblePolicies: readonly IndexedWorkspacePolicy[];
  readonly onSelect: (selection: Selection) => void;
  readonly onMoveConfiguration: (selection: Selection, direction: "up" | "down") => void;
  readonly onRemoveConfiguration: (selection: Selection) => void;
  readonly onNewPolicyNameChange: (name: string) => void;
  readonly onNewPolicyPlatformChange: (platform: string) => void;
  readonly onCreatePolicy: () => void;
  readonly onQueryChange: (query: string) => void;
  readonly onToggleCreate: () => void;
  readonly onCloseCreate: () => void;
}): JSX.Element {
  return (
    <div className="policy-navigator">
      <div className="pane-head nav-pane-head">
        <h2>Policies</h2>
      </div>
      <div className="nav-toolbar">
        <input
          aria-label="Search policies"
          name="policy-search"
          type="search"
          autoComplete="off"
          placeholder="Find a policy"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
        />
        <button
          type="button"
          className="nav-new-btn"
          title="New policy"
          aria-label="New policy"
          aria-expanded={props.showCreate}
          onClick={props.onToggleCreate}
        >
          <span aria-hidden="true">+</span>
          <span>New policy</span>
        </button>
      </div>
      <PolicyNavigatorCreate
        visible={props.showCreate}
        name={props.newPolicyName}
        platform={props.newPolicyPlatform}
        platforms={props.creatablePlatforms}
        onNameChange={props.onNewPolicyNameChange}
        onPlatformChange={props.onNewPolicyPlatformChange}
        onCreate={props.onCreatePolicy}
        onClose={props.onCloseCreate}
      />
      {props.visiblePolicies.length === 0 && !props.showCreate ? (
        <p className="empty-state">
          {props.policies.length === 0
            ? "No policies yet. Use + to create one."
            : "No policies match the search."}
        </p>
      ) : null}
      {props.visiblePolicies.map(({ policy, policyIndex }) => (
        <PolicyTree
          key={policy.path}
          policy={policy}
          policyIndex={policyIndex}
          selection={props.selection}
          templatesByType={props.templatesByType}
          isDirty={props.isDirty}
          onSelect={props.onSelect}
          onMoveConfiguration={props.onMoveConfiguration}
          onRemoveConfiguration={props.onRemoveConfiguration}
        />
      ))}
    </div>
  );
}
