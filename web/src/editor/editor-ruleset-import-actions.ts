/** Provides uploaded and bundled ruleset import entry points. */
import type { ImportBuildActionInput } from "./editor-import-build-actions.js";
import { reportImportError } from "./editor-ruleset-apply.js";
import type { WorkspaceRequest } from "./editor-workspace-request-guard.js";
import { ALL_RECOMMENDATION_PLATFORMS, filterActionableRecommendationRuleset } from "./recommendation-platform.js";

type ApplyRuleset = (name: string, parsed: unknown, request: WorkspaceRequest) => Promise<"applied" | "blocked">;

function confirmRulesetReplace(input: ImportBuildActionInput): boolean {
  return !input.isDirty || window.confirm("Importing a ruleset replaces the current workspace. Continue?");
}

export function createRulesetImportActions(input: ImportBuildActionInput, applyRuleset: ApplyRuleset): {
  readonly importRuleset: () => Promise<void>;
  readonly importRecommendationRuleset: () => Promise<void>;
} {
  async function importRuleset(): Promise<void> {
    const file = input.rulesetFile;
    if (file === undefined) {
      input.setActionErrorStatus("Choose a ruleset JSON file first");
      return;
    }
    if (!confirmRulesetReplace(input)) return;
    const request = input.requestGuard.begin();
    try {
      await applyRuleset(file.name, JSON.parse(await file.text()) as unknown, request);
    } catch (error) {
      if (input.requestGuard.isCurrent(request)) reportImportError(input, error, "Ruleset import");
    }
  }
  async function importRecommendationRuleset(): Promise<void> {
    const catalog = input.recommendationCatalog;
    if (catalog?.ruleset === undefined) {
      input.setActionErrorStatus(`No bundled ruleset is available for ${input.recommendationSummary?.label ?? input.recommendationSource.toUpperCase()}`);
      return;
    }
    if (!confirmRulesetReplace(input)) return;
    const platform = input.recommendationPlatform === ALL_RECOMMENDATION_PLATFORMS ? undefined : catalog.displayToImportPlatform[input.recommendationPlatform];
    const ruleset = filterActionableRecommendationRuleset(catalog.ruleset, platform);
    if (ruleset.policies.length === 0) {
      input.setActionErrorStatus(`No actionable ${input.recommendationSummary?.label ?? input.recommendationSource.toUpperCase()} ruleset settings are available for ${input.recommendationPlatform}`);
      return;
    }
    const request = input.requestGuard.begin();
    try {
      await applyRuleset(catalog.ruleset.name, ruleset, request);
    } catch (error) {
      if (input.requestGuard.isCurrent(request)) reportImportError(input, error, "Bundled ruleset import");
    }
  }
  return { importRuleset, importRecommendationRuleset };
}
