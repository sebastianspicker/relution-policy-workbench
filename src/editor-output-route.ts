import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./editor-routes-utils.js";
import type { EditorRequestContext } from "./editor-server.js";
import { outputFileName, readOutputFileNoFollow } from "./editor-static-assets.js";

export function handleOutputApiRequest(
  url: URL,
  _request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): boolean {
  if (url.pathname !== "/api/output") return false;
  let output: Buffer;
  try {
    output = readOutputFileNoFollow(context.options.out);
  } catch {
    sendJson(response, 404, { error: "No built .rexp output is available yet" });
    return true;
  }
  response.writeHead(200, {
    "content-type": "application/octet-stream",
    "content-disposition": `attachment; filename="${outputFileName(context.options.out)}"`,
    "content-length": String(output.length),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(output);
  return true;
}
