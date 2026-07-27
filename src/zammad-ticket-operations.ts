/** Coordinates idempotent Zammad ticket creation, reconciliation, and persistence. */
import { createHash } from "node:crypto";
import { HttpError } from "./editor-http-input.js";
import { createZammadTicket, findZammadTicketByOperationId, type ZammadConnection, type ZammadTicketResult } from "./zammad-api.js";
import type { ZammadTicketDraft } from "./zammad-ticket-drafts.js";
import type { HttpServiceTransportOptions } from "./http-service-transport.js";
import { resultFromRecord } from "./zammad-operation-identities.js";
import { readOperation } from "./zammad-operation-file.js";
import { claimOperation, persistCompleted } from "./zammad-operation-store.js";

/** A workspace-local idempotency boundary for ticket creation. */
export class ZammadTicketOperations {
  private readonly inFlight = new Map<string, Promise<ZammadTicketResult>>();
  private readonly completed = new Map<string, ZammadTicketResult>();

  constructor(private readonly workspace: string, private readonly transportOptions: HttpServiceTransportOptions = {}) {}

  async create(connection: ZammadConnection, draft: ZammadTicketDraft): Promise<ZammadTicketResult> {
    const operationId = zammadTicketOperationId(connection, draft);
    const remembered = this.completed.get(operationId);
    if (remembered !== undefined) return remembered;
    const active = this.inFlight.get(operationId);
    if (active !== undefined) return await active;
    const operation = this.createOnce(connection, draft, operationId);
    this.inFlight.set(operationId, operation);
    try {
      const result = await operation;
      this.completed.set(operationId, result);
      return result;
    } finally { this.inFlight.delete(operationId); }
  }

  private async createOnce(connection: ZammadConnection, draft: ZammadTicketDraft, operationId: string): Promise<ZammadTicketResult> {
    const claim = claimOperation(this.workspace, operationId);
    if (claim.operation.state === "completed") return resultFromRecord(claim.operation.result, connection);
    if (!claim.created) {
      const latest = readOperation(this.workspace, operationId);
      if (latest?.state === "completed") return resultFromRecord(latest.result, connection);
      const reconciled = await findZammadTicketByOperationId(connection, operationId, this.transportOptions);
      if (reconciled === undefined) throw uncertainOperationConflict(operationId);
      return persistCompleted(this.workspace, operationId, reconciled, connection);
    }
    const created = await createZammadTicket(connection, draft, this.transportOptions, operationId);
    return persistCompleted(this.workspace, operationId, created, connection);
  }
}

export function zammadTicketOperationId(connection: ZammadConnection, draft: ZammadTicketDraft): string {
  const material = JSON.stringify({
    destination: { baseUrl: connection.baseUrl, group: connection.group, customer: connection.customer },
    draft: { kind: draft.kind, title: draft.title, body: draft.body, deviceUuid: draft.deviceUuid ?? null, issueId: draft.issueId },
  });
  return `relution-op-${createHash("sha256").update(material, "utf8").digest("hex")}`;
}

function uncertainOperationConflict(operationId: string): HttpError {
  return new HttpError(409, `Zammad ticket outcome is uncertain for operation ${operationId}; search Zammad for this operation ID before retrying.`);
}
