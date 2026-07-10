import { isAbsolute, normalize } from "node:path";

const TEMP_PATH_PREFIX = "/tmp/relution-policy-workbench-";

export function editorServerCommand(options: { readonly workspace: string; readonly output: string; readonly port: number }): string {
  const { workspace, output, port } = options;
  const workspaceArgument = temporaryPathArgument(workspace, "workspace");
  const outputArgument = temporaryPathArgument(output, "output");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Editor server port must be an integer between 1 and 65535");
  }
  return `rm -rf -- ${workspaceArgument} ${outputArgument} && env -u FORCE_COLOR node dist/src/cli.js serve --workspace ${workspaceArgument} --out ${outputArgument} --host 127.0.0.1 --port ${String(port)} --key key123`;
}

function temporaryPathArgument(path: string, label: string): string {
  if (!isAbsolute(path) || normalize(path) !== path || !path.startsWith(TEMP_PATH_PREFIX)) {
    throw new Error(`Editor server ${label} must be a normalized ${TEMP_PATH_PREFIX}* path`);
  }
  return shellQuote(path);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
