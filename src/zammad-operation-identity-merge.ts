/** Merges only corroborating persisted Zammad ticket identities. */
import type { PersistedTicketResult } from "./zammad-operation-contract.js";

export function mergePersistedTicketResults(existing: PersistedTicketResult, incoming: PersistedTicketResult): PersistedTicketResult {
  const matchingId = existing.id !== undefined && incoming.id !== undefined && existing.id === incoming.id;
  const matchingNumber = existing.number !== undefined && incoming.number !== undefined && existing.number === incoming.number;
  const conflictingId = existing.id !== undefined && incoming.id !== undefined && existing.id !== incoming.id;
  const conflictingNumber = existing.number !== undefined && incoming.number !== undefined && existing.number !== incoming.number;
  if (conflictingId || conflictingNumber || (!matchingId && !matchingNumber)) throw new Error("Zammad operation completed with conflicting ticket identifiers");
  return {
    ...(existing.id === undefined ? (incoming.id === undefined ? {} : { id: incoming.id }) : { id: existing.id }),
    ...(existing.number === undefined ? (incoming.number === undefined ? {} : { number: incoming.number }) : { number: existing.number }),
  };
}
