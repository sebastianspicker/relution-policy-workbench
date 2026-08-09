# 0003: Preserve transactional archive and sidecar persistence

Status: Active  
Date: 2026-08-09

## Context

REXP archives and editor sidecars can contain sensitive policy state. Partial
writes, path traversal, symlink substitution, unauthenticated extraction, or a
failed multi-file update could corrupt the workspace or modify files outside it.

## Decision

Archive extraction, packing, and editor persistence remain bounded and
transactional. Managed outputs use validated paths, private atomic replacement,
staging, and explicit rollback. Editor-only sidecar data remains outside the
authenticated `.rexp` payload.

## Invariants

- Archive authentication and structural limits are checked before extracted
  content is published.
- Archive entry paths, destination ancestry, and managed files reject traversal
  and symlink substitution.
- Private files are staged and atomically replaced; failed multi-file changes
  restore the prior workspace and sidecar state or report rollback failure.
- DDM, MDM command drafts, and other editor sidecar state are not packed into a
  `.rexp` archive.

## Ownership and source of truth

Repository maintainers own the boundary. The implementation authority is
`src/rexp-extraction.ts`, `src/rexp-packing.ts`,
`src/utils/atomic-private-file.ts`, `src/sidecar-persistence.ts`, and
`src/editor-server-archive-compliance-routes.ts`.

## Compatibility

Existing authenticated archive formats and plaintext workspace behavior remain
compatible. Sidecar schema evolution must preserve the separation from archive
content and must validate before replacing prior state.

## Rollback and recovery

Failed operations restore the captured archive, workspace, and sidecar state.
If recovery itself fails, surface both failures and stop further mutation; do
not claim success or continue from partially persisted state.

## Verification

`tests/rexp-extraction-atomicity.test.ts`,
`tests/atomic-private-file.test.ts`, `tests/editor-sidecar-rollback.test.ts`, and
`tests/rexp-editor-api-sidecar.test.ts` cover containment, atomic replacement,
sidecar separation, and rollback behavior.
