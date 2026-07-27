/** Converts bounded Node response messages into reusable Fetch Responses. */
import type { IncomingMessage } from "node:http";
import { httpServiceContentLength } from "./http-service-content-length.js";

export async function incomingMessageToResponse(incoming: IncomingMessage, maxResponseBytes: number): Promise<Response> {
  const declaredLength = httpServiceContentLength(incoming.headers["content-length"]);
  if (declaredLength !== undefined && declaredLength > maxResponseBytes) {
    incoming.destroy();
    throw responseLimitError(maxResponseBytes);
  }
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of incoming) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxResponseBytes) {
      incoming.destroy();
      throw responseLimitError(maxResponseBytes);
    }
    chunks.push(buffer);
  }
  const headers = new Headers();
  for (const [name, rawValue] of Object.entries(incoming.headers)) {
    for (const value of Array.isArray(rawValue) ? rawValue : rawValue === undefined ? [] : [rawValue]) headers.append(name, value);
  }
  const bytes = Buffer.concat(chunks);
  return new Response(bytes.length === 0 ? null : bytes, {
    status: incoming.statusCode ?? 500,
    statusText: incoming.statusMessage ?? "",
    headers,
  });
}

function responseLimitError(maxResponseBytes: number): Error {
  return new Error(`HTTP service response exceeds ${String(maxResponseBytes)} bytes`);
}
