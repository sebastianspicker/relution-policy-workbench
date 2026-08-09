// Enforces read-only Relution requests and delegates authenticated network transport.
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import type { RelutionConnection } from "./relution-api-types.js";
import { fetchServiceApi } from "./service-api-request.js";

class RelutionNetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RelutionNetworkError";
  }
}

export async function relutionFetch(
  connection: RelutionConnection,
  path: string,
  init: RequestInit,
  transportOptions: HttpServiceTransportOptions,
): Promise<Response> {
  assertRelutionReadOnlyRequest(init.method, path);
  return await fetchServiceApi({
    connection,
    serviceName: "Relution",
    path,
    init,
    transportOptions,
    serviceHeaders: {
      "accept": "application/json",
      "accept-charset": "UTF-8",
      "content-type": "application/json",
      "X-User-Access-Token": connection.apiToken,
    },
    createNetworkError: (message, cause) => new RelutionNetworkError(message, { cause }),
  });
}

export function assertRelutionReadOnlyRequest(method: string | undefined, path: string): void {
  const normalizedMethod = (method ?? "GET").toUpperCase();
  // Relution exposes device search as POST, but this endpoint only reads base
  // device information. Do not add mutating endpoints here for production use.
  if (normalizedMethod === "POST" && path === "/api/v2/devices/baseInfo/query") {
    return;
  }
  throw new Error(`Blocked non-read-only Relution API request: ${normalizedMethod} ${path}`);
}
