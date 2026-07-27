/** Publishes optional encrypted MDM archives under the shared creation-key policy. */
import { rmSync } from "node:fs";
import { relative, resolve } from "node:path";
import type { MdmGeneratedManifest } from "./mdm-types.js";
import { packPlainDirectory, verifyRexp } from "./rexp.js";
import { assertNewArchiveKey } from "./rexp-key-policy.js";

export function generateEncryptedMdmArchives(
  root: string,
  artifacts: MdmGeneratedManifest["artifacts"],
): void {
  const key = process.env.RELUTION_REXP_KEY;
  if (key === undefined || key.length === 0) return;
  assertNewArchiveKey(key);
  const archiveRoot = resolve(root, "private/mdm-archives/LAB");
  rmSync(archiveRoot, { recursive: true, force: true });
  for (const artifact of artifacts) {
    const output = resolve(archiveRoot, `${artifact.policy_id}.rexp`);
    packPlainDirectory(resolve(root, artifact.workspace_path), output, key, { force: true });
    if (!verifyRexp(output, key).ok) {
      throw new Error(`Generated archive failed verification: ${relative(root, output)}`);
    }
  }
}
