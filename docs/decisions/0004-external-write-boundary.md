# 0004: Keep Relution read-only and Zammad writes explicit

Status: Active
Date: 2026-08-09

## Context

The workbench uses live service data for local policy engineering. Treating all
service integrations alike would make an inspection workflow capable of
unexpected production mutation. Zammad ticket creation is the sole supported
external write and needs stronger replay and user-intent controls.

## Decision

Production Relution operations remain read-only. Zammad ticket creation remains
a separate, explicit user action with durable operation identity,
single-writer coordination, and reconciliation before any retry after an
ambiguous result.

## Invariants

- The low-level Relution boundary rejects operations outside its declared
  read-only request contract.
- No Relution policy import, publication, assignment, or mutation is exposed as
  a production product operation.
- Zammad creation requires explicit editor intent and records an idempotent
  operation identity before accepting a completion result.
- Ambiguous Zammad writes are reconciled and are never blindly retried.

## Ownership and source of truth

Repository maintainers own the boundary. Relution authority is implemented by
`src/relution-transport.ts` and `src/relution-api.ts`. Zammad authority is
implemented by `src/zammad-editor-route-handlers.ts`,
`src/zammad-ticket-operations.ts`, and the `src/zammad-api.ts` facade.

## Compatibility

Read-only Relution queries and explicit Zammad creation remain supported.
Adding another external write or changing Relution write policy requires a new
decision, explicit authorization, failure semantics, and dedicated tests.

## Rollback and recovery

Disable the affected external action when its intent or result is uncertain.
For Zammad, retain the operation record and reconcile against the official
service response before retrying. Never convert an uncertain completion into a
second write.

## Verification

`tests/relution-api.test.ts`, `tests/zammad-api.test.ts`,
`tests/zammad-operation-hardening.test.ts`, and
`tests/editor-mutation-disconnect.test.ts` cover the read-only guard, explicit
write path, idempotency, reconciliation, and disconnect behavior.
