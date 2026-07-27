/** Shared lifecycle for focused controller behavior suites. */
import { afterEach, describe, vi } from "vitest";

export function controllerSuite(name: string, defineCases: () => void): void {
  describe(name, () => {
    afterEach(() => { vi.restoreAllMocks(); });
    defineCases();
  });
}
