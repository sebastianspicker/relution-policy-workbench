/** Builds the shared local editor server configuration for Playwright suites. */
import { editorServerCommand } from "./editor-server-command.js";

export { EDITOR_E2E_API_TOKEN } from "./editor-server-command.js";

export function editorPlaywrightDefaults(options: {
  port: number;
  workspace: string;
  output: string;
  serverTimeout?: number;
}) {
  return {
    fullyParallel: false,
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: { baseURL: `http://127.0.0.1:${String(options.port)}` },
    webServer: {
      command: editorServerCommand(options),
      url: `http://127.0.0.1:${String(options.port)}/`,
      reuseExistingServer: false,
      timeout: options.serverTimeout ?? 120_000,
    },
  };
}
