/** Checks live editor interactions across desktop and compact browser viewports. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  buildRexpArchive,
  importRuleset,
  openBaselineBuilder,
  openSettingsAndSetKey,
  selectBsiExpertBaseline,
} from "./editor-flow-helpers.js";
import { EDITOR_E2E_API_TOKEN } from "./playwright-config-helpers.js";

const archiveSecret = process.env.RELUTION_E2E_REXP_KEY ?? "playwright-local-archive-key";
const fixtureArchiveKey = "key123";
const rulesetPath = resolve("example/relution-baseline-templates/tiered/ios/tier-3-modules.json");
const fixtureRexpPath = resolve("example/sample-policy-export.rexp");

const visualSections = [
  { route: "policies", heading: "Select a policy to start editing", slug: "policies" },
  { route: "baselines/builder", heading: "Baseline builder", slug: "baseline-builder" },
  { route: "baselines/recommendations", heading: "Recommendations", slug: "recommendations" },
  { route: "baselines/compliance", heading: "Compliance", slug: "compliance" },
  { route: "settings", heading: "Settings", slug: "settings" },
  { route: "device-audit", heading: "Device audit", slug: "device-audit" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto(`/#editorToken=${encodeURIComponent(EDITOR_E2E_API_TOKEN)}`);
  await expect(page.getByRole("banner").getByText("REXP Studio", { exact: true })).toBeVisible();
});

test("top-level sections keep deterministic visual and accessibility structure", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", "Chromium owns the checked-in visual baseline; all projects run the functional suites.");

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 1024, height: 900 },
    { name: "compact", width: 390, height: 844 },
  ] as const) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const section of visualSections) {
      await page.goto(`/#/${section.route}`);
      await expect(page.getByRole("heading", { name: section.heading })).toBeVisible();
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: "App sections" }).first()).toBeVisible();
      const accessibilityTree = await page.locator("body").ariaSnapshot();
      expect(accessibilityTree).toContain(section.heading);
      await expect(page).toHaveScreenshot(`${section.slug}-${viewport.name}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
        maxDiffPixelRatio: 0.01,
        scale: "css",
      });
    }
  }
});

test("wizard, ruleset import, rexp build/download, failed output download, and rexp import work in the browser", async ({ page }) => {
  page.on("dialog", (dialog) => {
    void dialog.accept();
  });

  await page.goto("/");
  await expect(page.getByRole("banner").getByText("REXP Studio", { exact: true })).toBeVisible();

  const apiHeaders = { "x-rexp-studio-token": EDITOR_E2E_API_TOKEN };
  const stateResponse = await page.request.get("/api/state", { headers: apiHeaders });
  await expect(stateResponse).toBeOK();
  const coverageResponse = await page.request.get("/api/recommendations/coverage", { headers: apiHeaders });
  await expect(coverageResponse).toBeOK();
  const templatesResponse = await page.request.get("/api/baseline-templates", { headers: apiHeaders });
  await expect(templatesResponse).toBeOK();
  const semanticAnalysisResponse = await page.request.get("/api/recommendations/semantic-analysis", { headers: apiHeaders });
  await expect(semanticAnalysisResponse).toBeOK();

  await openBaselineBuilder(page);
  await page.getByRole("button", { name: "Replace workspace with selected baseline" }).click();
  await expect(page.locator(".status-bar-message")).toContainText("Applied baseline template");

  await selectBsiExpertBaseline(page);
  await page.getByRole("button", { name: "Replace workspace with expert selection" }).click();
  await expect(page.locator(".status-bar-message")).toContainText("Applied expert baseline selection");

  await openSettingsAndSetKey(page, archiveSecret);
  await importRuleset(page, rulesetPath);
  await buildRexpArchive(page);
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const downloadedArchive = test.info().outputPath("playwright-built.rexp");
  await download.saveAs(downloadedArchive);

  const nodeEnv = { ...process.env };
  delete nodeEnv.FORCE_COLOR;
  const verifyOutput = execFileSync("node", ["dist/src/cli.js", "verify", downloadedArchive, "--key", archiveSecret], {
    encoding: "utf8",
    env: nodeEnv,
  });
  expect(verifyOutput).toContain("VERDICT: PASS");

  await page.route("**/api/output", async (route) => {
    await route.fulfill({ status: 404, contentType: "text/plain", body: "missing output" });
  });
  await page.getByRole("button", { name: "Download" }).click();
  await expect(page.locator(".status-bar-message")).toContainText(/Download failed: Failed to download output archive \(404/u);
  await page.unroute("**/api/output");

  // The checked-in fixture predates the new-key policy; imports retain compatibility with it.
  await openSettingsAndSetKey(page, fixtureArchiveKey);
  await page.getByLabel("Relution .rexp file").setInputFiles(fixtureRexpPath);
  await page.getByRole("button", { name: "Import archive" }).click();
  await expect(page.locator(".status-bar-message")).toContainText("Imported sample-policy-export");

  await page.getByRole("button", { name: "Policies" }).first().click();
  await expect(page.getByRole("heading", { name: "Example iOS Policy" })).toBeVisible();
});

test("section routes and responsive panes preserve a contained document", async ({ page }) => {
  await page.goto("/#/policies");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#\/policies$/u);

  for (const width of [320, 390, 768, 1180, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/#/policies");
    await expect(page.locator(".status-bar")).toBeVisible();
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth, `${width}px document overflow`).toBeLessThanOrEqual(geometry.clientWidth);

    if (width <= 1180) {
      const workspace = page.getByRole("region", { name: "Policy workspace" });
      const editorControl = page.getByRole("button", { name: "Editor", exact: true });
      const navigationControl = page.getByRole("button", { name: "Navigation", exact: true });
      const inspectorControl = page.getByRole("button", { name: "Inspector", exact: true });
      await editorControl.click();
      await expect(workspace).toHaveClass(/compact-pane-editor/u);
      await expect(editorControl).toHaveAttribute("aria-pressed", "true");
      const editorBox = await page.locator(".editor-panel").boundingBox();
      expect(editorBox?.width ?? 0, `${width}px active editor pane width`).toBeGreaterThanOrEqual(width - 2);
      await expect(navigationControl).toHaveAttribute("aria-controls", "editor-navigation-pane");
      await expect(inspectorControl).toHaveAttribute("aria-controls", "editor-inspector-pane");

      await navigationControl.click();
      await expect(workspace).toHaveClass(/compact-pane-navigation/u);
      await expect(navigationControl).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#editor-navigation-pane")).toBeVisible();
      await expect(page.locator(".editor-panel")).toBeHidden();

      await inspectorControl.click();
      await expect(workspace).toHaveClass(/compact-pane-inspector/u);
      await expect(inspectorControl).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#editor-inspector-pane")).toBeVisible();
      await expect(page.locator("#editor-navigation-pane")).toBeHidden();

      const compactGeometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(compactGeometry.scrollWidth, `${width}px compact document overflow`).toBeLessThanOrEqual(compactGeometry.clientWidth);
    }
  }

  await page.goto("/#/baselines/recommendations");
  await expect(page.getByRole("tab", { name: "Recommendations" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Settings" }).first().click();
  await expect(page).toHaveURL(/#\/settings$/u);
  await page.goBack();
  await expect(page).toHaveURL(/#\/baselines\/recommendations$/u);
  await expect(page.getByRole("tab", { name: "Recommendations" })).toHaveAttribute("aria-selected", "true");

  await page.goto("/#/not-a-route");
  await expect(page).toHaveURL(/#\/policies$/u);
});
