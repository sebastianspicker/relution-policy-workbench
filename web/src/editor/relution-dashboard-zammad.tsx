// Supports Relution dashboard UI state, controls, and test fixtures.
import type { JSX } from "react";
import type { ZammadTicketDraft } from "../../../src/zammad-ticket-drafts.js";
import type { ZammadPublicSession, ZammadTicketResult } from "../../../src/zammad-api.js";
import type { Protocol } from "./relution-dashboard-types.js";
import { ZammadConnectionForm } from "./relution-dashboard-zammad-connection.js";
import { ZammadTicketDraftSection, ZammadTicketResultMessage } from "./relution-dashboard-zammad-ticket.js";
import { StatusChip } from "./StatusChip.js";

export interface ZammadSectionProps {
  readonly protocol: Protocol;
  readonly host: string;
  readonly port: string;
  readonly token: string;
  readonly group: string;
  readonly customer: string;
  readonly session: ZammadPublicSession;
  readonly loading: boolean;
  readonly draft: ZammadTicketDraft | undefined;
  readonly result: ZammadTicketResult | undefined;
  readonly confirming: boolean;
  readonly onProtocol: (value: Protocol) => void;
  readonly onHost: (value: string) => void;
  readonly onPort: (value: string) => void;
  readonly onToken: (value: string) => void;
  readonly onGroup: (value: string) => void;
  readonly onCustomer: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onTest: () => void;
  readonly onReview: () => void;
  readonly onCancel: () => void;
  readonly onCreate: () => void;
}

export type ZammadConnectionProps = Pick<ZammadSectionProps, "protocol" | "host" | "port" | "token" | "group" | "customer" | "loading" | "session" | "onProtocol" | "onHost" | "onPort" | "onToken" | "onGroup" | "onCustomer" | "onSubmit" | "onTest">;
export type ZammadTicketDraftProps = Pick<ZammadSectionProps, "draft" | "result" | "confirming" | "loading" | "session" | "host" | "group" | "customer" | "onReview" | "onCancel" | "onCreate">;

export function ZammadSection(props: ZammadSectionProps): JSX.Element {
  return (
    <details className="audit-disclosure audit-disclosure--external">
      <summary>
        <span>Zammad ticketing</span>
        <StatusChip kind="warning">External write</StatusChip>
      </summary>
      <div className="zammad-content">
        <p className="status">
          {props.session.configured ? `Zammad ${props.session.baseUrl ?? "configured"}` : "No Zammad API session configured"}
        </p>
        <p className="zammad-warning">Ticket creation writes to the configured Zammad instance and always requires confirmation.</p>
        <ZammadConnectionForm {...props} />
        <ZammadTicketDraftSection {...props} />
        <ZammadTicketResultMessage result={props.result} />
      </div>
    </details>
  );
}
