/** Verifies the isolated GitHub Pages build without starting the loopback editor API. */
import { defineConfig, devices } from "@playwright/test";

const port = 4174;

export default defineConfig({
  testDir: "./tests/demo-e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: `http://127.0.0.1:${port}/rexp-studio/`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm build:demo && pnpm exec vite preview --mode demo --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/rexp-studio/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
