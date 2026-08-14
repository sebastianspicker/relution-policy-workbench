/** Shares fixture readers and structural assertions for reference-catalog tests. */
import assert from "node:assert/strict";
export type JsonRecord = Record<string, unknown>;

export type SourceEntry = {
  id: string;
  url: string;
};

export type DownloadManifestEntry = {
  id: string;
  url: string;
  localPath: string;
  headersPath: string;
  textPath: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
};

export function assertReferenceManifestCoverage(
  sources: readonly SourceEntry[],
  manifest: readonly DownloadManifestEntry[],
): void {
  assert.deepEqual(manifest.map((entry) => entry.id).sort(), sources.map((entry) => entry.id).sort());
  for (const entry of manifest) {
    assert.equal(entry.url, sources.find((source) => source.id === entry.id)?.url);
    assert.equal(entry.sha256.length, 64, entry.id);
    assert.equal(entry.sizeBytes > 0, true, entry.id);
  }
}

type RulesetPolicy = {
  platform: string;
  name: string;
  rules: Array<{
    id: string;
    title: string;
    informational?: boolean;
    mappings?: JsonRecord[];
    reason?: string;
    sourceIds?: string[];
  }>;
};

export type ImportableRuleset = {
  version: number;
  name: string;
  policies: RulesetPolicy[];
};

export function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce(valueAtSafePathSegment, value);
}

/** Refuses prototype-sensitive segments while traversing untrusted reference JSON. */
function valueAtSafePathSegment(current: unknown, part: string): unknown {
  if (!isSafeObjectPathSegment(part) || current === null || typeof current !== "object") {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(current, part)?.value;
}

function isSafeObjectPathSegment(part: string): boolean {
  return part !== "__proto__" && part !== "constructor" && part !== "prototype";
}
