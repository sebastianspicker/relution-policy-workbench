/** Performs Zammad requests through the shared pinned-service transport. */
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { createServiceNetworkError, fetchServiceApi } from "./service-api-request.js";
import type { ZammadConnection } from "./zammad-api-contract.js";

export async function zammadFetch(
  connection: ZammadConnection,
  path: string,
  init: RequestInit,
  transportOptions: HttpServiceTransportOptions,
  query?: URLSearchParams,
): Promise<Response> {
  return await fetchServiceApi({
    connection,
    serviceName: "Zammad",
    path,
    init,
    transportOptions,
    serviceHeaders: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Token token=${connection.apiToken}`,
    },
    createNetworkError: createServiceNetworkError("ZammadNetworkError"),
    ...(query === undefined ? {} : { query }),
  });
}
