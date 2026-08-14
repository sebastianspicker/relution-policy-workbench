/** Checks the public tour's interaction boundary and responsive presentation. */
import { expect, test } from "@playwright/test";

test("static tour switches scenes and keeps command actions simulated", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");

  await expect(page.getByRole("heading", { name: "A local policy workspace" })).toBeVisible();
  for (const label of ["Save Simulated", "Build archive Simulated", "Download Simulated"]) {
    await expect(page.getByRole("button", { name: label })).toBeDisabled();
  }

  await page.getByRole("button", { name: "Policy", exact: true }).last().click();
  await expect(page).toHaveURL(/#\/tour\/policy$/u);
  await expect(page.getByRole("heading", { name: "Edit policy configuration" })).toBeVisible();
  await expect(page.getByAltText(/policy editor showing an iOS passcode/u)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("demo-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const auditTab = page.getByRole("button", { name: /Device audit/u });
  await auditTab.click();
  await expect(page.getByRole("heading", { name: "Review read-only posture" })).toBeVisible();
  await expect(auditTab).toHaveAttribute("aria-current", "step");
  await page.locator(".demo-scene-tab").evaluateAll(async (tabs) => {
    await Promise.all(tabs.flatMap((tab) => tab.getAnimations()).map(async (animation) => animation.finished));
  });
  const activeTabStyles = await page.locator(".demo-scene-tab").evaluateAll((tabs) => tabs.map((tab) => ({
    current: tab.getAttribute("aria-current"),
    shadow: getComputedStyle(tab).boxShadow,
  })));
  expect(activeTabStyles.filter((style) => style.current === "step")).toHaveLength(1);
  expect(activeTabStyles.at(3)?.shadow).not.toBe("none");
  expect(activeTabStyles.at(2)?.shadow).toBe("none");
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  await page.screenshot({ path: test.info().outputPath("demo-mobile.png"), fullPage: true });
});
