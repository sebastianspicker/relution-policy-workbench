/** Shares stable editor workflows between functional and screenshot Playwright suites. */
import { expect, type Page } from "@playwright/test";

export async function openBaselineBuilder(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Baselines" }).first().click();
  await expect(page.getByRole("heading", { name: "Baseline builder" })).toBeVisible();
}

export async function selectBsiExpertBaseline(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Expert" }).click();
  await page.getByRole("checkbox", { name: "Vendor" }).uncheck();
  await page.getByRole("checkbox", { name: "CIS" }).uncheck();
  await expect(page.getByText("Selected baseline coverage")).toBeVisible();
}

export async function openSettingsAndSetKey(page: Page, archiveSecret: string): Promise<void> {
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.getByLabel("Archive passphrase").fill(archiveSecret);
  await page.getByRole("button", { name: "Set passphrase" }).click();
  await expect(page.locator(".status-bar-message")).toContainText(/Passphrase (?:set|validated)/u);
}

export async function importRuleset(page: Page, rulesetPath: string): Promise<void> {
  await page.getByLabel("Ruleset JSON file").setInputFiles(rulesetPath);
  await page.getByRole("button", { name: "Import ruleset" }).click();
  await expect(page.locator(".status-bar-message")).toContainText("Imported ruleset");
}

export async function buildRexpArchive(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Build archive" }).click();
  await expect(page.locator(".status-bar-message")).toContainText("Built");
}
