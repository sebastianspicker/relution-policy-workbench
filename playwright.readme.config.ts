// Capture deterministic 1440×1000 public tour images from the built local editor.
import { defineConfig } from "@playwright/test";
import { editorPlaywrightDefaults } from "./tests/e2e/playwright-config-helpers.js";

const port = 8792;
const workspace = "/tmp/rexp-studio-readme-tour";
const output = "/tmp/rexp-studio-readme-tour-output.rexp";
const defaults = editorPlaywrightDefaults({ workspace, output, port });

export default defineConfig({
  ...defaults,
  testDir: "./tests/readme-tour",
  reporter: "list",
  use: {
    ...defaults.use,
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    trace: "off",
  },
});
