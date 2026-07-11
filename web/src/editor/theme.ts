export const THEME_STORAGE_NAME = "relution-policy-workbench:corporate-theme";
export const CUSTOM_THEME_STORAGE_NAME = "relution-policy-workbench:custom-corporate-theme";

const CUSTOM_THEME_TOKEN_NAMES = [
  "--ci-color-page",
  "--ci-color-surface",
  "--ci-color-toolbar-bg",
  "--ci-color-toolbar-text",
  "--ci-color-primary",
  "--ci-color-primary-contrast",
] as const;

export const THEME_PACKS = [
  { value: "default", label: "Default", dataTheme: "default" },
  { value: "organization", label: "Institution", dataTheme: "organization" },
  { value: "relution", label: "Relution", dataTheme: "relution" },
  { value: "dark", label: "Dark", dataTheme: "dark" },
  { value: "custom", label: "Custom", dataTheme: "custom" },
] as const;

export type CorporateTheme = (typeof THEME_PACKS)[number]["value"];
export type CustomThemeTokenName = (typeof CUSTOM_THEME_TOKEN_NAMES)[number];
export type CustomThemeTokens = Partial<Record<CustomThemeTokenName, string>>;
export type ThemePack = (typeof THEME_PACKS)[number];
export interface ThemeContrastFailure {
  readonly foreground: string;
  readonly background: string;
  readonly minimum: number;
  readonly pair: string;
  readonly ratio: number;
}
export interface ThemeContrastResult {
  readonly ok: boolean;
  readonly failures: readonly ThemeContrastFailure[];
}

export type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const DEFAULT_THEME: CorporateTheme = "default";
export const DEFAULT_CUSTOM_THEME_TOKENS: CustomThemeTokens = {
  "--ci-color-page": "#f4f6f8",
  "--ci-color-surface": "#ffffff",
  "--ci-color-toolbar-bg": "#20242a",
  "--ci-color-toolbar-text": "#ffffff",
  "--ci-color-primary": "#1d6fb8",
  "--ci-color-primary-contrast": "#ffffff",
};

export const CUSTOM_THEME_TOKEN_OPTIONS = [
  { name: "--ci-color-page", label: "Page" },
  { name: "--ci-color-surface", label: "Surface" },
  { name: "--ci-color-toolbar-bg", label: "Toolbar" },
  { name: "--ci-color-toolbar-text", label: "Toolbar text" },
  { name: "--ci-color-primary", label: "Primary" },
  { name: "--ci-color-primary-contrast", label: "Primary text" },
] as const satisfies readonly { readonly name: CustomThemeTokenName; readonly label: string }[];

export function themeStorage(): ThemeStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function isCorporateTheme(value: unknown): value is CorporateTheme {
  return typeof value === "string" && THEME_PACKS.some((theme) => theme.value === value);
}

export function parseCorporateTheme(value: unknown): CorporateTheme {
  return isCorporateTheme(value) ? value : DEFAULT_THEME;
}

export function readCorporateTheme(storage: ThemeStorage | undefined): CorporateTheme {
  if (storage === undefined) {
    return DEFAULT_THEME;
  }

  try {
    return parseCorporateTheme(storage.getItem(THEME_STORAGE_NAME));
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeCorporateTheme(storage: ThemeStorage | undefined, theme: CorporateTheme): boolean {
  if (storage === undefined) {
    return false;
  }

  try {
    storage.setItem(THEME_STORAGE_NAME, theme);
    return true;
  } catch {
    return false;
  }
}

export function isCustomThemeTokenName(value: unknown): value is CustomThemeTokenName {
  return typeof value === "string" && CUSTOM_THEME_TOKEN_NAMES.some((tokenName) => tokenName === value);
}

export function sanitizeCustomThemeTokenValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 120) {
    return undefined;
  }

  return /^#[\da-f]{6}$/iu.test(trimmed) ? trimmed : undefined;
}

export function parseCustomThemeTokens(value: unknown): CustomThemeTokens {
  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const tokens: CustomThemeTokens = {};
    for (const [tokenName, tokenValue] of Object.entries(parsed)) {
      if (isCustomThemeTokenName(tokenName)) {
        const sanitized = sanitizeCustomThemeTokenValue(tokenValue);
        if (sanitized !== undefined) {
          tokens[tokenName] = sanitized;
        }
      }
    }
    return tokens;
  } catch {
    return {};
  }
}

export function readCustomThemeTokens(storage: ThemeStorage | undefined): CustomThemeTokens {
  if (storage === undefined) {
    return {};
  }

  try {
    return parseCustomThemeTokens(storage.getItem(CUSTOM_THEME_STORAGE_NAME));
  } catch {
    return {};
  }
}

export function writeCustomThemeTokens(storage: ThemeStorage | undefined, tokens: CustomThemeTokens): boolean {
  if (storage === undefined) {
    return false;
  }

  const sanitizedTokens: CustomThemeTokens = {};
  for (const [tokenName, tokenValue] of Object.entries(tokens)) {
    if (isCustomThemeTokenName(tokenName)) {
      const sanitized = sanitizeCustomThemeTokenValue(tokenValue);
      if (sanitized !== undefined) {
        sanitizedTokens[tokenName] = sanitized;
      }
    }
  }

  if (!validateCustomThemeContrast({ ...DEFAULT_CUSTOM_THEME_TOKENS, ...sanitizedTokens }).ok) {
    return false;
  }

  try {
    storage.setItem(CUSTOM_THEME_STORAGE_NAME, JSON.stringify(sanitizedTokens));
    return true;
  } catch {
    return false;
  }
}

export function validateCustomThemeContrast(tokens: CustomThemeTokens): ThemeContrastResult {
  const resolved = { ...DEFAULT_CUSTOM_THEME_TOKENS, ...tokens };
  const pairs = [
    ["Toolbar text", resolved["--ci-color-toolbar-text"], resolved["--ci-color-toolbar-bg"], 4.5],
    ["Primary action text", resolved["--ci-color-primary-contrast"], resolved["--ci-color-primary"], 4.5],
    ["Primary focus on surface", resolved["--ci-color-primary"], resolved["--ci-color-surface"], 3],
    ["Primary focus on page", resolved["--ci-color-primary"], resolved["--ci-color-page"], 3],
  ] as const;
  const failures: ThemeContrastFailure[] = [];
  for (const [pair, foreground, background, minimum] of pairs) {
    if (foreground === undefined || background === undefined) continue;
    const ratio = contrastRatio(foreground, background);
    if (ratio < minimum) failures.push({ pair, foreground, background, minimum, ratio });
  }
  return { ok: failures.length === 0, failures };
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function resetCustomThemeTokens(storage: ThemeStorage | undefined): boolean {
  if (storage === undefined) {
    return false;
  }

  try {
    storage.removeItem(CUSTOM_THEME_STORAGE_NAME);
    return true;
  } catch {
    return false;
  }
}

export function applyCustomThemeTokens(target: HTMLElement, tokens: CustomThemeTokens): void {
  for (const tokenName of CUSTOM_THEME_TOKEN_NAMES) {
    const tokenValue = tokens[tokenName];
    if (tokenValue === undefined) {
      target.style.removeProperty(tokenName);
    } else {
      target.style.setProperty(tokenName, tokenValue);
    }
  }
}

export function clearCustomThemeTokens(target: HTMLElement): void {
  for (const tokenName of CUSTOM_THEME_TOKEN_NAMES) {
    target.style.removeProperty(tokenName);
  }
}
