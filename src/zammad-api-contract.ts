/** Defines the public Zammad connection and ticket result contracts. */
import type { HttpProtocol } from "./connection-normalization.js";

type ZammadProtocol = HttpProtocol;

export interface ZammadConnectionInput {
  protocol?: ZammadProtocol;
  host: string;
  port?: number;
  basePath?: string;
  apiToken: string;
  group: string;
  customer: string;
  allowLocalServiceHosts?: boolean;
}

export interface ZammadConnection {
  protocol: ZammadProtocol;
  host: string;
  port?: number;
  basePath: string;
  apiToken: string;
  group: string;
  customer: string;
  baseUrl: string;
  allowLocalServiceHosts: boolean;
}

export interface ZammadPublicSession {
  configured: boolean;
  baseUrl?: string;
  tokenConfigured: boolean;
  group?: string;
  customer?: string;
}

interface ZammadTicketResultBase {
  title?: string;
  url?: string;
  raw: Record<string, unknown>;
}

export type ZammadTicketResult = ZammadTicketResultBase & (
  | { id: number; number?: string }
  | { id?: number; number: string }
);

export type ZammadConnectionTestResult =
  | { ok: true; baseUrl: string }
  | { ok: false; baseUrl: string; reason: string };
