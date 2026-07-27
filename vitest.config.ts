// Exercise browser-layer components in jsdom with serialized workers for stable resource usage.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    maxWorkers: 1,
    setupFiles: ["./web/src/test/setup.ts"],
    include: ["web/src/**/*.test.ts", "web/src/**/*.test.tsx"],
  },
});
