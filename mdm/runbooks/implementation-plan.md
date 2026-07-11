# Controlled implementation batches

The reference architecture is approved for implementation and controlled Lab
testing. Each remaining batch is a separate reviewable change with named
approver, rollback owner and evidence; production promotion still requires a
recorded release approval.

| Batch | Scope and prerequisites | Tests / approval / rollback | Suggested commit subject |
|---|---|---|---|
| 1 | Private inventory, exports, hashes and backup; read-only access approved | completeness/truncation report; service owner; restore one export | `docs(mdm): establish sanitised inventory baseline` |
| 2 | Management-plane MFA/RBAC/log/backup review; break-glass named | MFA and restore tests; CISO/operations; retain prior role export | `security(mdm): protect Relution administration` |
| 3 | Current group/policy catalogue and migration dispositions | overlap/dependency graph; service owner; no deletions | `docs(mdm): map group and policy migration` |
| 4 | Lab/Pilot/Early/Broad/Quarantine groups | deterministic membership test; change manager; remove empty ring assignments | `feat(mdm): define deployment rings` |
| 5 | Approve normalised control catalogue and deviations | mapping/licence/applicability review; security/privacy/operations | `docs(mdm): approve baseline control catalogue` |
| 6 | Apple source policies only for evidenced models | schema, DDM/legacy conflict, supervised/User Enrollment tests; Apple owner; import rollback export | `feat(mdm): add Apple pilot policy sources` |
| 7 | Windows source policies only for supported editions/builds | CSP result, BitLocker recovery, update ring, WDAC audit; Windows owner | `feat(mdm): add Windows pilot policy sources` |
| 8 | Android policies split by fully managed/COPE/BYOD/dedicated | explicit policy, privacy, non-compliance and wipe-semantics tests; Android owner | `feat(mdm): add Android Enterprise pilot sources` |
| 9 | Connectivity, apps and data protection overlays | certificate renewal and positive/negative app/data-flow tests; app/network/data owners | `feat(mdm): add managed connectivity and data boundaries` |
| 10 | Compliance states, notifications, support integration | simulated failures through recovery; security/support; disable automation first | `feat(mdm): stage graduated compliance remediation` |
| 11 | Exception workflow and narrow profiles | expiry/report test; risk owner; remove exception assignment | `feat(mdm): add expiring MDM exceptions` |
| 12 | Generate installed-version import units and manifests | deterministic/schema/secret/conflict checks; technical reviewer; preserve sources and exports | `build(mdm): generate validated Relution imports` |
| 13 | Lab then representative Pilot | success/failure criteria and observation period; CAB; restore export/remove target policy | `test(mdm): record pilot evidence` |
| 14 | Early/Broad staged promotion and audit closeout | help-desk telemetry, effective-state sample, rollback drill; CAB/risk owner | `docs(mdm): record staged rollout and audit evidence` |

## Per-batch record

Record scope, policy/control versions, devices/models, prerequisites, expected
user symptom, support diagnosis, success/failure criteria, observation period,
telemetry, communication, approval, rollback trigger/method, evidence hashes and
source-control commit. Emergency deployment shortens observation only under a
documented incident decision; it does not bypass rollback or evidence.

## Rollback order

Stop promotion; disable automated destructive actions; remove the newest narrow
assignment; reassign the last known-good policy/version; restore required
certificate/network dependencies; validate effective state; notify users and
support; preserve logs; open incident/problem records; decide whether the failed
version is fixed or retired. Rollback itself is a controlled change.
