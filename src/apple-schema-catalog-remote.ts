/** Retrieves Apple schema source documents from their allowlisted GitHub locations. */
import { APPLE_SCHEMA_SOURCE_PATHS, type AppleSchemaDocument } from "./apple-schema-catalog-storage.js";
import {
  appleSchemaGithubApiUrl,
  appleSchemaRawDocumentUrl,
  assertExpectedAppleSchemaDownloadUrl,
  fetchAppleSchemaUrl,
} from "./apple-schema-catalog-urls.js";
import { asRecord } from "./utils/json-guards.js";

interface RemoteDirectoryEntry {
  name: string;
  downloadUrl?: string;
}

export async function readRemoteAppleSchemaDocuments(revision: string): Promise<AppleSchemaDocument[]> {
  const documents: AppleSchemaDocument[] = [];
  const errors: string[] = [];
  for (const source of APPLE_SCHEMA_SOURCE_PATHS) {
    const files = await readRemoteAppleSchemaDirectory(source.path, revision);
    for (const file of files) {
      if (!file.name.endsWith(".yaml") || file.downloadUrl === undefined) continue;
      const url = appleSchemaRawDocumentUrl(source.path, file.name, revision);
      assertExpectedAppleSchemaDownloadUrl(file.downloadUrl, url);
      const response = await fetchAppleSchemaUrl(url);
      if (!response.ok) {
        errors.push(`Failed to fetch ${url.href}: ${response.status} ${response.statusText}`);
        continue;
      }
      documents.push({ kind: source.kind, path: `${source.path}/${file.name}`, content: await response.text() });
    }
  }
  if (errors.length > 0) throw new Error(`Failed to fetch ${errors.length} Apple schema document(s):\n${errors.join("\n")}`);
  return documents;
}

async function readRemoteAppleSchemaDirectory(path: string, revision: string): Promise<RemoteDirectoryEntry[]> {
  const response = await fetchAppleSchemaUrl(appleSchemaGithubApiUrl(path, revision));
  if (!response.ok) throw new Error(`Failed to list Apple schema path ${path}: ${response.status} ${response.statusText}`);
  const parsed = await response.json() as unknown;
  if (!Array.isArray(parsed)) throw new Error(`Unexpected GitHub directory response for ${path}`);
  return parsed.map(toRemoteDirectoryEntry).filter((entry) => entry.name.length > 0);
}

function toRemoteDirectoryEntry(value: unknown): RemoteDirectoryEntry {
  const record = asRecord(value) ?? {};
  const name = typeof record.name === "string" ? record.name : "";
  const downloadUrl = typeof record.download_url === "string" ? record.download_url : undefined;
  return downloadUrl === undefined ? { name } : { name, downloadUrl };
}
