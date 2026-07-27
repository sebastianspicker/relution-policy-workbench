/** Public facade for Zammad connection, ticket, and reconciliation contracts. */
export {
  normalizeZammadConnection,
  publicZammadSession,
} from "./zammad-api-connection.js";
export {
  createZammadTicket,
  testZammadConnection,
} from "./zammad-api-ticket.js";
export { findZammadTicketByOperationId } from "./zammad-api-reconciliation.js";
export { isValidZammadTicketNumber } from "./zammad-api-ticket-result.js";
export type {
  ZammadConnection,
  ZammadConnectionInput,
  ZammadPublicSession,
  ZammadTicketResult,
} from "./zammad-api-contract.js";
