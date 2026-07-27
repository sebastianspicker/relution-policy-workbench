/** Implements authenticated workspace mutation endpoints for the editor. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./editor-routes-utils.js";
import { requireNumber, requireString } from "./editor-api-request-input.js";
import { badRequest, type JsonRecord } from "./editor-http-input.js";
import { readJsonBody } from "./editor-json-body.js";
import type { RelutionTemplateBundle } from "./templates.js";
import {
  addAppleCompatConfigurationToWorkspace,
  addConfigurationToWorkspace,
  addPolicyToWorkspace,
  moveConfigurationInWorkspace,
  removeConfigurationFromWorkspace,
  validateWorkspace,
  type PolicyWorkspace,
} from "./workspace.js";

interface WorkspaceMutationContext {
  readonly options: { readonly workspace: string };
  readonly bundle: RelutionTemplateBundle;
}

interface WorkspaceMutationResult {
  readonly workspace: PolicyWorkspace;
  readonly extra?: JsonRecord;
}

const WORKSPACE_MUTATION_ROUTES: readonly {
  readonly path: string;
  readonly mutate: (workspacePath: string, bundle: RelutionTemplateBundle, body: JsonRecord) => WorkspaceMutationResult;
}[] = [
  {
    path: "/api/add-configuration",
    mutate: (workspacePath, bundle, body) => ({
      workspace: addConfigurationToWorkspace(workspacePath, bundle, {
        policyPath: requireString(body, "policyPath"),
        versionIndex: requireNumber(body, "versionIndex"),
        type: requireString(body, "type"),
      }),
    }),
  },
  {
    path: "/api/apple-compat/add",
    mutate: (workspacePath, _bundle, body) => ({
      workspace: addAppleCompatConfigurationToWorkspace(workspacePath, {
        policyPath: requireString(body, "policyPath"),
        versionIndex: requireNumber(body, "versionIndex"),
        settingId: requireString(body, "settingId"),
      }),
    }),
  },
  {
    path: "/api/configuration/remove",
    mutate: (workspacePath, _bundle, body) => ({
      workspace: removeConfigurationFromWorkspace(workspacePath, {
        policyPath: requireString(body, "policyPath"),
        versionIndex: requireNumber(body, "versionIndex"),
        configurationIndex: requireNumber(body, "configurationIndex"),
      }),
    }),
  },
  {
    path: "/api/configuration/move",
    mutate: (workspacePath, _bundle, body) => ({
      workspace: moveConfigurationInWorkspace(workspacePath, {
        policyPath: requireString(body, "policyPath"),
        versionIndex: requireNumber(body, "versionIndex"),
        configurationIndex: requireNumber(body, "configurationIndex"),
        direction: requireMoveDirection(body),
      }),
    }),
  },
  {
    path: "/api/add-policy",
    mutate: (workspacePath, bundle, body) => {
      const result = addPolicyToWorkspace(workspacePath, bundle, {
        platform: requireString(body, "platform"),
        name: requireString(body, "name"),
      });
      return { workspace: result.workspace, extra: { policyPath: result.policyPath } };
    },
  },
];

export async function handleWorkspaceMutationApiRequest(
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  context: WorkspaceMutationContext,
): Promise<boolean> {
  const route = WORKSPACE_MUTATION_ROUTES.find((candidate) => candidate.path === url.pathname);
  if (route === undefined || request.method !== "POST") return false;

  const body = await readJsonBody(request);
  const result = route.mutate(context.options.workspace, context.bundle, body);
  sendJson(response, 200, {
    workspace: result.workspace,
    validation: validateWorkspace(result.workspace, context.bundle),
    ...result.extra,
  });
  return true;
}

function requireMoveDirection(body: JsonRecord): "up" | "down" {
  const direction = requireString(body, "direction");
  if (direction !== "up" && direction !== "down") {
    throw badRequest(`Unsupported move direction: ${direction}`);
  }
  return direction;
}
