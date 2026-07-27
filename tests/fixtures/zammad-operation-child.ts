/** Runs controlled child-process cases for Zammad operation locking tests. */
import { appendFileSync, existsSync } from "node:fs";
import type { HttpServiceTransportOptions } from "../../src/http-service-transport.js";
import { normalizeZammadConnection } from "../../src/zammad-api.js";
import { ZammadTicketOperations } from "../../src/zammad-ticket-operations.js";

const workspace = process.argv[2];
const postCounter = process.argv[3];
const draftTitle = process.argv[4] ?? "Cross-process ticket";
const outcomes = process.argv[5] || undefined;
const release = process.argv[6] || undefined;
if (workspace === undefined || postCounter === undefined) throw new Error("Expected workspace and counter paths");

const transport: HttpServiceTransportOptions = {
  adapter: {
    resolveAddresses: async () => [{ address: "8.8.8.8", family: 4 }],
    request: async (url, init) => {
      if (url.pathname === "/api/v1/tickets" && init.method === "POST") {
        appendFileSync(postCounter, "post\n");
        if (outcomes !== undefined) appendFileSync(outcomes, "post\n");
        if (release === undefined) {
          await new Promise<void>((resolve) => setTimeout(resolve, 100));
        } else {
          await waitForRelease(release);
        }
        return new Response(JSON.stringify({ id: 91, number: "240091" }), { status: 201 });
      }
      if (url.pathname === "/api/v1/tickets/search" && init.method === "GET") {
        return new Response("[]");
      }
      throw new Error(`Unexpected child request: ${init.method ?? "GET"} ${url.pathname}`);
    },
  },
};

const connection = normalizeZammadConnection({
  host: "zammad.example.test",
  apiToken: "secret-token",
  group: "IT",
  customer: "it@example.test",
});
const draft = {
  kind: "non-compliant-device" as const,
  title: draftTitle,
  body: "Only one process may create this ticket.",
  issueId: "missing-policy",
};

try {
  await new ZammadTicketOperations(workspace, transport).create(connection, draft);
} catch (error) {
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status !== 409 && status !== 503) throw error;
  if (outcomes !== undefined) appendFileSync(outcomes, `rejected-${String(status)}\n`);
}

async function waitForRelease(path: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the operation-test release file");
}
