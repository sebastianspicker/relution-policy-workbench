/** Shared contracts for the editor HTTP runtime and its route handlers. */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AppleSchemaCatalog } from "./apple-schema.js";
import type { EditorKeyValidationResponse } from "./editor-key-validation.js";
import type { EditorMutationQueues } from "./editor-mutation-routing.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import type { RelutionEditorRuntime } from "./relution-editor-routes.js";
import type { RelutionTemplateBundle } from "./templates.js";
import type { ZammadEditorRuntime } from "./zammad-editor-routes.js";

export interface EditorServerOptions {
  workspace: string;
  key: string;
  out: string;
  allowLocalServiceHosts?: boolean;
  bundlePath?: string;
  host?: string;
  port?: number;
  /** Test-only deterministic capability for browser harnesses; ordinary editor sessions generate one. */
  apiToken?: string;
  /** Programmatic transport seam for deterministic local tests. */
  serviceTransport?: HttpServiceTransportOptions;
}

export interface EditorServerHandle {
  /** Loopback origin for programmatic clients. API requests require apiToken. */
  url: string;
  /** Browser launch URL; the fragment is consumed into sessionStorage by the UI. */
  browserUrl: string;
  apiToken: string;
  /** Programmatic diagnostics; this is not exposed through the HTTP API. */
  pendingMutationCount: (domain: keyof EditorMutationQueues) => number;
  close: () => Promise<void>;
}

export interface EditorRuntimeState {
  key: string;
  keyValidation: EditorKeyValidationResponse;
  relution: RelutionEditorRuntime;
  zammad: ZammadEditorRuntime;
  networkApiToken: string;
  mutationQueues: EditorMutationQueues;
}

export interface EditorRequestContext {
  readonly options: EditorServerOptions;
  readonly bundle: RelutionTemplateBundle;
  readonly appleSchema: AppleSchemaCatalog;
  readonly runtimeState: EditorRuntimeState;
}

export type EditorApiHandler = (
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
) => boolean | Promise<boolean>;

export async function runEditorApiHandlers(
  handlers: readonly EditorApiHandler[],
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: EditorRequestContext,
): Promise<boolean> {
  for (const handler of handlers) {
    if (await handler(url, request, response, context)) return true;
  }
  return false;
}
