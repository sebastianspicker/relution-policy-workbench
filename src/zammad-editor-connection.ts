/** Validates Zammad session input before it becomes active editor state. */
import { HttpConnectionInputError } from "./connection-normalization.js";
import { badRequest } from "./editor-http-input.js";
import { assertAllowedEditorServiceHost } from "./editor-service-host-policy.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { normalizeZammadConnection, type ZammadConnection } from "./zammad-api.js";
import { parseZammadConnectionInput } from "./zammad-editor-input.js";

export async function parseAllowedZammadConnection(
  body: Record<string, unknown>,
  allowLocalServiceHosts: boolean,
  transportOptions: HttpServiceTransportOptions = {},
): Promise<ZammadConnection> {
  let connection: ZammadConnection;
  try {
    connection = normalizeZammadConnection({ ...parseZammadConnectionInput(body), allowLocalServiceHosts });
  } catch (error) {
    if (error instanceof HttpConnectionInputError) throw badRequest(error.message);
    throw error;
  }
  await assertAllowedEditorServiceHost("Zammad", connection.host, allowLocalServiceHosts, transportOptions);
  return connection;
}
