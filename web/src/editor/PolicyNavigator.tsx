/** Filters and navigates workspace policies while retaining the active selection. */
import { useEffect, useState, type JSX } from "react";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";
import { PolicyNavigatorCreate } from "./PolicyNavigatorCreate.js";
import { PolicyTree } from "./PolicyTree.js";
import { policyMatches } from "./policy-navigation-search.js";
import type { Selection } from "./types.js";

export function PolicyNavigator(props: {
  readonly policies: readonly WorkspacePolicy[];
  readonly selection: Selection | undefined;
  readonly templatesByType: ReadonlyMap<string, ConfigurationTemplate>;
  readonly newPolicyName: string;
  readonly newPolicyPlatform: string;
  readonly creatablePlatforms: readonly string[];
  readonly isDirty: boolean;
  readonly onSelect: (selection: Selection) => void;
  readonly onMoveConfiguration: (selection: Selection, direction: "up" | "down") => void;
  readonly onRemoveConfiguration: (selection: Selection) => void;
  readonly onNewPolicyNameChange: (name: string) => void;
  readonly onNewPolicyPlatformChange: (platform: string) => void;
  readonly onCreatePolicy: () => void;
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(props.policies.length === 0);
  useEffect(() => {
    if (props.policies.length === 0) {
      setShowCreate(true);
    }
  }, [props.policies.length]);
  const visiblePolicies = props.policies
    .map((policy, policyIndex) => ({ policy, policyIndex }))
    .filter(({ policy }) => policyMatches(policy, query, props.templatesByType));
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
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          className="nav-new-btn"
          title="New policy"
          aria-label="New policy"
          aria-expanded={showCreate}
          onClick={() => setShowCreate((s) => !s)}
        >
          <span aria-hidden="true">+</span>
          <span>New policy</span>
        </button>
      </div>
      <PolicyNavigatorCreate
        visible={showCreate}
        name={props.newPolicyName}
        platform={props.newPolicyPlatform}
        platforms={props.creatablePlatforms}
        onNameChange={props.onNewPolicyNameChange}
        onPlatformChange={props.onNewPolicyPlatformChange}
        onCreate={props.onCreatePolicy}
        onClose={() => setShowCreate(false)}
      />
      {visiblePolicies.length === 0 && !showCreate ? (
        <p className="empty-state">
          {props.policies.length === 0
            ? "No policies yet. Use + to create one."
            : "No policies match the search."}
        </p>
      ) : null}
      {visiblePolicies.map(({ policy, policyIndex }) => (
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

export { policyMatches } from "./policy-navigation-search.js";
