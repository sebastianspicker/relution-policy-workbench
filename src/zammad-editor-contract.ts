/** Declares the mutable Zammad state owned by the editor server runtime. */
import type { ZammadConnection } from "./zammad-api.js";
import type { ZammadTicketOperations } from "./zammad-ticket-operations.js";

export interface ZammadEditorRuntime {
  connection?: ZammadConnection;
  ticketOperations?: ZammadTicketOperations;
}
