/** Contract for one DDM or MDM-command sidecar artifact route family. */
import type { AppleSchemaCatalog, AppleSchemaValues } from "./apple-schema.js";
import type { JsonRecord } from "./editor-http-input.js";
import type { EditorRequestContext } from "./editor-server-contract.js";

export type ManagedAppleArtifactRoute = {
  readonly basePath: string;
  readonly add: (context: EditorRequestContext, body: JsonRecord) => unknown;
  readonly update: (workspace: string, catalog: AppleSchemaCatalog, uuid: string, values: AppleSchemaValues, revision: string) => unknown;
  readonly remove: (workspace: string, uuid: string, revision: string) => unknown;
};
