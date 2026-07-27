/** Validates theme token extraction and deterministic CSS output. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_CUSTOM_THEME_TOKENS } from "../web/src/editor/theme-contract.js";
import {
  CUSTOM_THEME_STORAGE_NAME,
  DEFAULT_THEME,
  parseCustomThemeTokens,
  parseCorporateTheme,
  readCustomThemeTokens,
  readCorporateTheme,
  resetCustomThemeTokens,
  themeStorage,
  THEME_STORAGE_NAME,
  writeCustomThemeTokens,
  writeCorporateTheme,
  validateCustomThemeContrast,
  type ThemeStorage,
} from "../web/src/editor/theme.js";

class MemoryThemeStorage implements ThemeStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("returns no theme storage when the browser storage surface is unavailable", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    delete (globalThis as { window?: unknown }).window;
    assert.equal(themeStorage(), undefined);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: Object.defineProperty({}, "localStorage", {
        get() {
          throw new Error("storage blocked");
        },
      }),
    });
    assert.equal(themeStorage(), undefined);
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      Object.defineProperty(globalThis, "window", previousWindow);
    }
  }
});

test("parses supported corporate themes", () => {
  assert.equal(parseCorporateTheme("studio"), "studio");
  assert.equal(parseCorporateTheme("neutral"), "neutral");
  assert.equal(parseCorporateTheme("organization"), "organization");
  assert.equal(parseCorporateTheme("custom"), "custom");
});

test("falls back to the default corporate theme for unsupported values", () => {
  assert.equal(parseCorporateTheme("Institution"), DEFAULT_THEME);
  assert.equal(parseCorporateTheme(""), DEFAULT_THEME);
  assert.equal(parseCorporateTheme(null), DEFAULT_THEME);
  assert.equal(parseCorporateTheme(undefined), DEFAULT_THEME);
});

test("reads stored corporate themes with safe fallback behavior", () => {
  const storage = new MemoryThemeStorage();
  storage.setItem(THEME_STORAGE_NAME, "organization");

  assert.equal(readCorporateTheme(storage), "organization");

  storage.setItem(THEME_STORAGE_NAME, "unknown");
  assert.equal(readCorporateTheme(storage), DEFAULT_THEME);
  assert.equal(readCorporateTheme(undefined), DEFAULT_THEME);
  assert.equal(
    readCorporateTheme({
      getItem() {
        throw new Error("storage blocked");
      },
      setItem() {},
      removeItem() {},
    }),
    DEFAULT_THEME,
  );
});

test("parses custom theme tokens from supported CSS custom properties", () => {
  assert.deepEqual(
    parseCustomThemeTokens(
      JSON.stringify({
        "--ci-color-page": "#101820",
        "--ci-color-primary": "#00aaff",
        "--ci-color-text": "#111111",
      }),
    ),
    {
      "--ci-color-page": "#101820",
      "--ci-color-primary": "#00aaff",
    },
  );
});

test("rejects unsafe custom theme token storage values", () => {
  assert.deepEqual(parseCustomThemeTokens("not json"), {});
  assert.deepEqual(parseCustomThemeTokens(JSON.stringify(["#ffffff"])), {});
  assert.deepEqual(
    parseCustomThemeTokens(
      JSON.stringify({
        "--ci-color-page": "red",
        "--ci-color-surface": "#fff",
        "--ci-color-primary": "#ffffff; color: red",
        "--ci-color-toolbar-bg": "#123abc",
      }),
    ),
    {
      "--ci-color-toolbar-bg": "#123abc",
    },
  );
});

test("reads, writes, and resets custom theme tokens safely", () => {
  const storage = new MemoryThemeStorage();

  assert.equal(
    writeCustomThemeTokens(storage, {
      // Page must keep ≥3:1 with the default viridian primary when merged for contrast checks.
      "--ci-color-page": "#e0e8f0",
      "--ci-color-primary": "bad",
    }),
    true,
  );
  assert.equal(storage.getItem(CUSTOM_THEME_STORAGE_NAME), "{\"--ci-color-page\":\"#e0e8f0\"}");
  assert.deepEqual(readCustomThemeTokens(storage), { "--ci-color-page": "#e0e8f0" });

  assert.equal(resetCustomThemeTokens(storage), true);
  assert.equal(storage.getItem(CUSTOM_THEME_STORAGE_NAME), null);
  assert.deepEqual(readCustomThemeTokens(undefined), {});
  assert.equal(writeCustomThemeTokens(undefined, { "--ci-color-page": "#101820" }), false);
  assert.equal(resetCustomThemeTokens(undefined), false);
});

test("handles custom theme token storage failures without throwing", () => {
  assert.deepEqual(
    readCustomThemeTokens({
      getItem() {
        throw new Error("storage blocked");
      },
      setItem() {},
      removeItem() {},
    }),
    {},
  );
  assert.equal(
    writeCustomThemeTokens(
      {
        setItem() {
          throw new Error("storage blocked");
        },
        getItem() {
          return null;
        },
        removeItem() {},
      },
      { "--ci-color-page": "#101820" },
    ),
    false,
  );
  assert.equal(
    resetCustomThemeTokens({
      removeItem() {
        throw new Error("storage blocked");
      },
      getItem() {
        return null;
      },
      setItem() {},
    }),
    false,
  );
});

test("writes corporate themes without leaking storage failures", () => {
  const storage = new MemoryThemeStorage();

  assert.equal(writeCorporateTheme(storage, "studio"), true);
  assert.equal(storage.getItem(THEME_STORAGE_NAME), "studio");
  assert.equal(writeCorporateTheme(undefined, "organization"), false);
  assert.equal(
    writeCorporateTheme(
      {
        setItem() {
          throw new Error("storage blocked");
        },
        getItem() {
          return null;
        },
        removeItem() {},
      },
      "organization",
    ),
    false,
  );
});

test("default custom theme tokens match Signal Desk viridian contract", () => {
  assert.deepEqual(DEFAULT_CUSTOM_THEME_TOKENS, {
    "--ci-color-page": "#e8edf2",
    "--ci-color-surface": "#ffffff",
    "--ci-color-toolbar-bg": "#121a24",
    "--ci-color-toolbar-text": "#d7e0ea",
    "--ci-color-primary": "#0d6e66",
    "--ci-color-primary-contrast": "#f4fffd",
  });
  assert.equal(validateCustomThemeContrast(DEFAULT_CUSTOM_THEME_TOKENS).ok, true);
});

test("rejects custom themes with inaccessible text or focus pairs", () => {
  const result = validateCustomThemeContrast({
    "--ci-color-primary": "#eeeeee",
    "--ci-color-primary-contrast": "#ffffff",
    "--ci-color-page": "#ffffff",
    "--ci-color-surface": "#ffffff",
  });
  assert.equal(result.ok, false);
  assert.equal(result.failures.some((failure) => failure.pair === "Primary action text"), true);
  assert.equal(result.failures.some((failure) => failure.pair === "Primary focus on surface"), true);

  const storage = new MemoryThemeStorage();
  assert.equal(writeCustomThemeTokens(storage, {
    "--ci-color-primary": "#eeeeee",
    "--ci-color-primary-contrast": "#ffffff",
  }), false);
  assert.equal(storage.getItem(CUSTOM_THEME_STORAGE_NAME), null);
});

test("all built-in theme text and focus pairs meet their contrast targets", () => {
  for (const theme of ["studio", "neutral", "organization", "dark"] as const) {
    const tokens = readThemeCssVariables(theme);
    assertContrast(tokens["--ci-color-text"], tokens["--ci-color-surface"], 4.5, `${theme} body`);
    assertContrast(tokens["--ci-color-primary-contrast"], tokens["--ci-color-primary"], 4.5, `${theme} primary`);
    assertContrast(tokens["--ci-color-focus"], tokens["--ci-color-surface"], 3, `${theme} focus`);
  }
});

test("uses the REXP Studio title and storage namespace without legacy reads", () => {
  const storage = new MemoryThemeStorage();
  const legacyThemeKey = ["relution", "policy", "workbench"].join("-") + ":corporate-theme";
  storage.setItem(legacyThemeKey, "dark");

  assert.equal(readCorporateTheme(storage), "studio");
  assert.equal(THEME_STORAGE_NAME.startsWith("rexp-studio:"), true);
  assert.equal(CUSTOM_THEME_STORAGE_NAME.startsWith("rexp-studio:"), true);
  const index = readFileSync("web/index.html", "utf8");
  assert.match(index, /<title>REXP Studio<\/title>/u);
  assert.match(index, /href="\/rexp-studio-mark\.svg"/u);
  assert.match(index, /local tools for Relution policy archives/u);
});

test("dark theme semantic status colors keep WCAG AA text contrast", () => {
  const tokens = readThemeCssVariables("dark");

  assertContrast(tokens["--ci-color-success-text"], tokens["--ci-color-success-bg"], 4.5, "success");
  assertContrast(tokens["--ci-color-info-text"], tokens["--ci-color-info-bg"], 4.5, "info");
  assertContrast(tokens["--ci-color-warning-text"], tokens["--ci-color-page"], 4.5, "warning page");
});

function readThemeCssVariables(theme: "studio" | "neutral" | "organization" | "dark"): Record<string, string> {
  // Tokens live in the modular design-system entry; workbench.css is only an import barrel.
  const css = readFileSync("web/src/styles/tokens.css", "utf8");
  const rootStart = css.indexOf(":root,");
  const rootEnd = rootStart === -1 ? -1 : css.indexOf("\n}", rootStart);
  const root = rootStart === -1 || rootEnd === -1 ? "" : css.slice(rootStart, rootEnd + 2);
  if (theme === "studio") return readCssVariables(root);
  const marker = `:root[data-theme="${theme}"],`;
  const overrideStart = css.indexOf(marker);
  const overrideEnd = overrideStart === -1 ? -1 : css.indexOf("\n}", overrideStart);
  const override = overrideStart === -1 || overrideEnd === -1 ? "" : css.slice(overrideStart, overrideEnd + 2);
  return { ...readCssVariables(root), ...readCssVariables(override) };
}

function readCssVariables(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-f]{6})/giu)) {
    tokens[match[1]!] = match[2]!;
  }
  return tokens;
}

function assertContrast(foreground: string | undefined, background: string | undefined, minimum: number, label: string): void {
  assert.notEqual(foreground, undefined, `${label} foreground token`);
  assert.notEqual(background, undefined, `${label} background token`);
  assert.equal(contrastRatio(foreground ?? "#000000", background ?? "#ffffff") >= minimum, true, `${label} contrast`);
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const [r, g, b] = [red, green, blue].map(linearize) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function linearize(component: number): number {
  return component <= 0.03928 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4;
}
