/** Coordinates baseline wizard mode, selections, and template application workflow. */
import { useEffect, useMemo, useState, type JSX } from "react";
import type {
  BaselineTemplatePlatform,
  BaselineTemplateShape,
  BaselineTemplateTier,
} from "../../../src/baseline-templates.js";
import { RECOMMENDATION_SOURCES } from "../../../src/recommendation-types.js";
import { presetSettingIds } from "./policy-wizard-selection.js";
import { PolicyWizardContent } from "./PolicyWizardContent.js";
import { useBaselineExpertOptions, useBaselineTemplateOptions, tierOptionsFor } from "./PolicyWizardPanel.data.js";
import { selectedBaselineOption } from "./policy-wizard-option-selection.js";
import { PolicyWizardHeader, type WizardMode } from "./PolicyWizardFrame.js";
import type { EditorController } from "./types.js";

export function PolicyWizardPanel({ controller }: { readonly controller: EditorController }): JSX.Element {
  const [mode, setMode] = useState<WizardMode>("guided");
  const [platform, setPlatform] = useState<BaselineTemplatePlatform>("IOS");
  const [tier, setTier] = useState<BaselineTemplateTier>(3);
  const [shape, setShape] = useState<BaselineTemplateShape>("modules");
  const [selectedSettingIds, setSelectedSettingIds] = useState<readonly string[]>([]);
  const [expertQuery, setExpertQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<readonly string[]>(RECOMMENDATION_SOURCES.slice());
  const { loadError, options } = useBaselineTemplateOptions(platform, setPlatform);
  const { expertError, expertOptions } = useBaselineExpertOptions(platform, shape);

  useEffect(() => {
    if (expertOptions !== undefined) {
      setSelectedSettingIds(presetSettingIds(expertOptions.settings, tier, selectedSources));
    }
  }, [expertOptions, selectedSources, tier]);

  const availableOptions = options?.options ?? [];
  const selectedOption = selectedBaselineOption(availableOptions, platform, tier, shape);
  const tierOptions = useMemo(() => tierOptionsFor(availableOptions, platform, shape), [availableOptions, platform, shape]);

  useEffect(() => {
    if (tierOptions.length > 0 && !tierOptions.includes(tier)) {
      setTier(tierOptions[0] ?? 3);
    }
  }, [tier, tierOptions]);

  function chooseTier(nextTier: BaselineTemplateTier): void {
    setTier(nextTier);
    if (mode === "expert" && expertOptions !== undefined) {
      setSelectedSettingIds(presetSettingIds(expertOptions.settings, nextTier, selectedSources));
    }
  }

  return (
    <div className="inspector-content policy-wizard">
      <PolicyWizardHeader optionsLoaded={options !== undefined} platform={platform} tier={tier} shape={shape} />
      {loadError !== undefined ? <p className="error">{loadError}</p> : null}
      {options === undefined && loadError === undefined ? <p className="loading-inline" aria-live="polite">Loading baseline templates…</p> : null}
      {options !== undefined ? (
        <PolicyWizardContent
          availableOptions={availableOptions}
          controller={controller}
          expertError={expertError}
          expertOptions={expertOptions}
          expertQuery={expertQuery}
          mode={mode}
          platform={platform}
          platformOptions={options.platforms}
          selectedOption={selectedOption}
          selectedSettingIds={selectedSettingIds}
          selectedSources={selectedSources}
          shape={shape}
          shapeOptions={options.shapes}
          tier={tier}
          onExpertQueryChange={setExpertQuery}
          onModeChange={setMode}
          onPlatformChange={setPlatform}
          onSelectedSettingIdsChange={setSelectedSettingIds}
          onSelectedSourcesChange={setSelectedSources}
          onShapeChange={setShape}
          onTierChange={chooseTier}
        />
      ) : null}
    </div>
  );
}
