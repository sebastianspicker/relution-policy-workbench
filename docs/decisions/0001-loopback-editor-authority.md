# 0001: Keep editor authority loopback-only and capability-bound

Status: Active
Date: 2026-08-09

## Context

The browser editor can read and mutate sensitive local policy workspaces. A
network-reachable listener or ambient browser authority would expand that trust
boundary beyond the local operating-system account.

## Decision

The editor remains loopback-only. Each process creates a high-entropy capability
token, and API access is accepted only through the loopback host and request
authority checks.

## Invariants

- Server startup accepts only loopback listener addresses.
- The process capability token is generated at runtime and is never a static
  repository or workspace secret.
- API requests require the expected capability and loopback host authority.
- Mutating browser requests must satisfy the same-origin request guard.

## Ownership and source of truth

Repository maintainers own the boundary. The implementation authority is
`src/editor-server-runtime.ts` and `src/editor-api-request-guards.ts`; CLI host
validation remains aligned with those modules.

## Compatibility

Local CLI and browser workflows may change presentation, but existing loopback
URLs and authorized API behavior must remain usable. Network editor support is
not a compatibility requirement.

## Rollback and recovery

On authority failure, stop the editor and start a new process to obtain a new
token. Revert a faulty authority change as one unit; do not recover by binding a
non-loopback address or bypassing token or origin checks.

## Verification

`tests/editor-runtime-regressions.test.ts`,
`tests/editor-request-input-regressions.test.ts`, and
`tests/cli-runtime-regressions.test.ts` exercise the listener, host, token, and
same-origin boundaries.
