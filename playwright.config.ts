// Run the built local editor against the supported Playwright browser matrix and visual baselines.
import { defineConfig } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { editorPlaywrightDefaults } from "./tests/e2e/playwright-config-helpers.js";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.EDITOR_PORT ?? "8791");
const workspace = "/tmp/rexp-studio-playwright";
const output = "/tmp/rexp-studio-playwright-output.rexp";
const defaults = editorPlaywrightDefaults({ workspace, output, port, serverTimeout: 180_000 });

export default defineConfig({
  ...defaults,
  // Browser projects share one mutable editor server and workspace fixture.
  workers: 1,
  testDir: "./tests/e2e",
  outputDir: join(projectRoot, "test-results/playwright"),
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  reporter: [
    ["list"],
    ["junit", { outputFile: join(projectRoot, "test-results/playwright.xml") }],
  ],
  use: {
    ...defaults.use,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
