/** Filters and navigates workspace policies while retaining the active selection. */
import type { JSX } from "react";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import type { WorkspacePolicy } from "../../../src/workspace.js";
import { PolicyNavigatorView } from "./PolicyNavigatorView.js";
import type { Selection } from "./types.js";
import { usePolicyNavigatorState } from "./usePolicyNavigatorState.js";

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
  const state = usePolicyNavigatorState(props.policies, props.templatesByType);
  return <PolicyNavigatorView {...props} {...state} onCloseCreate={state.closeCreate} onQueryChange={state.setQuery} onToggleCreate={state.toggleCreate} />;
}

export { policyMatches } from "./policy-navigation-search.js";
