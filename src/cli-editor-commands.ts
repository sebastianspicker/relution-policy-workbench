/** Implements explicit workspace creation, archive editing, and editor server lifecycle. */
import { resolve } from "node:path";
import { startEditorServer } from "./editor-server.js";
import type { ParsedArgs } from "./cli.js";
import { optionalInteger, optionalString, requirePositional, requireString } from "./cli-arg-values.js";
import { requireKey } from "./cli-runtime.js";
import { extractRexp } from "./rexp.js";
import { resetEditorSidecar } from "./sidecar.js";
import { loadTemplateBundle } from "./templates.js";
import { createNewWorkspace } from "./workspace.js";

export function newCommand(args: ParsedArgs): void {
  const workspace = requireString(args, "workspace", "new requires --workspace <dir>");
  const platform = requireString(args, "platform", "new requires --platform <Platform>");
  const name = requireString(args, "name", "new requires --name <policy name>");
  const bundle = loadTemplateBundle(optionalString(args, "bundle"));
  if (platform === "UNKNOWN" || !bundle.platforms.includes(platform)) {
    throw new Error(`Unsupported policy platform: ${platform}`);
  }
  createNewWorkspace({ workspace, platform, name, serverVersion: bundle.serverVersion, force: args.options.force === true });
  if (args.options.force === true) resetEditorSidecar(workspace);
  console.log(`Created workspace ${resolve(workspace)}`);
}

export async function editCommand(args: ParsedArgs): Promise<void> {
  const file = requirePositional(args, 0, "edit requires a .rexp file");
  const workspace = requireString(args, "workspace", "edit requires --workspace <dir>");
  const out = requireString(args, "out", "edit requires --out <file.rexp>");
  const key = requireKey(args);
  extractRexp(file, workspace, key, { force: args.options.force === true, pretty: true });
  await serveEditor(args, workspace, out, key);
}

export async function serveEditor(args: ParsedArgs, workspace: string, out: string, key: string): Promise<void> {
  const bundlePath = optionalString(args, "bundle");
  const apiToken = optionalString(args, "editor-api-token");
  const options: Parameters<typeof startEditorServer>[0] = {
    workspace,
    out,
    key,
    allowLocalServiceHosts: args.options["allow-local-service-hosts"] === true,
    port: optionalInteger(args, "port") ?? 8787,
    host: optionalString(args, "host") ?? "127.0.0.1",
    ...(apiToken === undefined ? {} : { apiToken }),
    ...(bundlePath === undefined ? {} : { bundlePath }),
  };
  const handle = await startEditorServer(options);
  console.log(`REXP Studio: ${handle.browserUrl}`);
  console.log(`Workspace: ${resolve(workspace)}`);
  console.log(`Output: ${resolve(out)}`);
  if (key.length === 0) console.log("Key: not set; enter one in the UI before importing or building encrypted .rexp files.");
  if (args.options.once === true) return handle.close();
  await new Promise<void>((resolveStop) => {
    process.once("SIGINT", () => { void handle.close().finally(resolveStop); });
    process.once("SIGTERM", () => { void handle.close().finally(resolveStop); });
  });
}
