import { useEffect, useState, type JSX } from "react";
import {
  applyCustomThemeTokens,
  clearCustomThemeTokens,
  CUSTOM_THEME_TOKEN_OPTIONS,
  DEFAULT_CUSTOM_THEME_TOKENS,
  parseCorporateTheme,
  readCustomThemeTokens,
  resetCustomThemeTokens,
  themeStorage,
  THEME_PACKS,
  writeCustomThemeTokens,
  validateCustomThemeContrast,
  type CorporateTheme,
  type CustomThemeTokenName,
  type CustomThemeTokens,
} from "./theme.js";

type ThemeSwitcherProps = {
  readonly theme: CorporateTheme;
  readonly onThemeChange: (theme: CorporateTheme) => void;
};

function getCustomTokens(): CustomThemeTokens {
  return { ...DEFAULT_CUSTOM_THEME_TOKENS, ...readCustomThemeTokens(themeStorage()) };
}

export function ThemeSwitcher({ theme, onThemeChange }: ThemeSwitcherProps): JSX.Element {
  const [customTokens, setCustomTokens] = useState<CustomThemeTokens>(getCustomTokens);
  const [appliedTokens, setAppliedTokens] = useState<CustomThemeTokens>(getCustomTokens);
  const [contrastError, setContrastError] = useState<string>();
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (theme === "custom") {
      applyCustomThemeTokens(document.documentElement, appliedTokens);
    } else {
      clearCustomThemeTokens(document.documentElement);
    }
  }, [appliedTokens, theme]);

  function updateCustomToken(tokenName: CustomThemeTokenName, tokenValue: string): void {
    const nextTokens = { ...customTokens, [tokenName]: tokenValue };
    setCustomTokens(nextTokens);
    const result = validateCustomThemeContrast(nextTokens);
    if (!result.ok) {
      setContrastError(result.failures.map((failure) => `${failure.pair}: ${failure.ratio.toFixed(2)}:1 (needs ${failure.minimum}:1)`).join("; "));
      return;
    }
    setContrastError(undefined);
    setAppliedTokens(nextTokens);
    if (writeCustomThemeTokens(themeStorage(), nextTokens)) onThemeChange("custom");
  }

  function resetCustomTokens(): void {
    resetCustomThemeTokens(themeStorage());
    setCustomTokens(DEFAULT_CUSTOM_THEME_TOKENS);
    setAppliedTokens(DEFAULT_CUSTOM_THEME_TOKENS);
    setContrastError(undefined);
    onThemeChange("custom");
  }

  return (
    <div className="theme-switcher">
      <label>
        Theme{" "}
        <select
          aria-label="Corporate theme"
          value={theme}
          onChange={(event) => onThemeChange(parseCorporateTheme(event.target.value))}
        >
          {THEME_PACKS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {theme === "custom" ? (
        <div className="theme-token-panel">
          <button
            type="button"
            aria-expanded={showTokens}
            onClick={() => setShowTokens((s) => !s)}
          >
            {showTokens ? "Hide tokens" : "Customize tokens"}
          </button>
          {showTokens ? (
            <div className="theme-token-inputs">
              {CUSTOM_THEME_TOKEN_OPTIONS.map((option) => (
                <label key={option.name}>
                  {option.label}{" "}
                  <input
                    aria-label={`Custom theme ${option.label}`}
                    type="color"
                    value={customTokens[option.name] ?? DEFAULT_CUSTOM_THEME_TOKENS[option.name] ?? "#000000"}
                    onChange={(event) => updateCustomToken(option.name, event.target.value)}
                  />
                </label>
              ))}
              {contrastError !== undefined ? <p className="field-error" role="alert">Custom theme not applied: {contrastError}</p> : null}
              <button type="button" onClick={resetCustomTokens}>
                Reset custom
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
