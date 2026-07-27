/** Supplies deterministic transport fakes for outbound HTTP service tests. */
import type { HttpServiceTransportOptions } from "../src/http-service-transport.js";

/** Explicit fetch seam for API unit tests; production never selects this adapter. */
export const TEST_HTTP_SERVICE_TRANSPORT: HttpServiceTransportOptions = {
  adapter: {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async (url, init) => await globalThis.fetch(url, init),
  },
};
