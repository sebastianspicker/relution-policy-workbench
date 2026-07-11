# Relution MDM architecture programme

Status: **Phase B source contract — LAB-only; not production ready**  
Assessment date: 2026-07-11  
Scope: Apple, Windows, Android, Relution management plane

This directory is the version-controlled, non-secret audit, source, and design
package. It contains deterministic LAB reference JSON, but no tenant inventory,
credentials, certificates, decrypted exports, production assignments, or
production-ready Policy Workbench artifacts.

## Current decision

- Reference architecture: **APPROVED**.
- Relution 26.1.1 schema: **REFERENCE_VALIDATED** against the checked-in
  template bundle.
- Production tenant inventory: **NOT_EVIDENCED**.
- Generated artifacts: status is derived only from their manifest test fields.

The approved reference architecture authorises offline generation and
controlled Lab testing. It does not prove the target tenant's version,
licences, topology, inventory, assignments, effective settings, or device
behaviour, and it does not authorise broad production assignment.

The offline evidence gate currently verifies 133 PDFs. Generated LAB artifacts
are syntax- and reference-schema validated; operational Lab and device states
remain false until evidence is recorded.

## Current local checkout

- Source manifest: 133 PDF records (121 recovered BSI, 10 CIS, one Microsoft,
  plus the separately acquired BSI MDM Mindeststandard).
- Policy sources: 23 records, of which 17 generate LAB artifacts.
- Generated output: 17 rulesets, 17 Relution workspaces, and 68 checksummed
  output files in the manifest.
- Required environment values: five explicit placeholders; no supplied values
  are committed.
- Local automated state: source verification, policy validation, deterministic
  regeneration, and Relution 26.1.1 reference-schema validation pass.
- Operational state: Lab round trip, device application, rollback, and
  production release approval are `false` / `NOT_EVIDENCED`.

`mdm verify-sources` requires the ignored PDF corpus in
`private/source-pdfs-cache/`. The tracked manifest uses repository-relative
cache paths for reproducibility; those paths are provenance locators, not
published PDF content or tenant data. A public clone can validate the source
contracts and generated outputs, but cannot re-hash absent PDFs.

## Evidence states

- `OBSERVED`: directly inspected in this checkout or a recovered source PDF.
- `DOCUMENTED`: stated by a cited primary source.
- `MEASURED`: produced by a deterministic command or controlled test.
- `INFERRED`: reasoned from evidence but not directly established.
- `PROPOSED`: target design requiring approval and environment validation.
- `NOT_EVIDENCED`: required information was not supplied.

`NOT_EVIDENCED` never means compliant, non-compliant, absent, or zero.

## Package map

- [Phase A assessment](audit/phase-a-assessment.md)
- [Current-state inventory](inventory/current-state.yaml)
- [Target architecture](architecture/target-model.md)
- [Assignment matrix](architecture/assignment-matrix.md)
- [Control catalogue](controls/control-catalogue.yaml)
- [Source ledger](controls/source-ledger.yaml)
- [PDF source manifest](evidence/source-manifest.json)
- [Recommendation reconciliation](evidence/recommendation-reconciliation.json)
- [Compliance matrix](audit/compliance-matrix.md)
- [Phase A validation gates](validation/phase-a-gates.md)
- [Implementation batches](runbooks/implementation-plan.md)
- [Operational procedures](runbooks/operations.md)
- [Operation catalogue](runbooks/operation-catalog.yaml)
- [Migration disposition catalogue](migration/disposition-catalog.yaml)
- [Phase B source gates](validation/phase-b-source-gates.md)
- [Policy sources](policies/)
- [Source schemas](schemas/)
- [Exception template](exceptions/exception-template.yaml)
- [Generated-artifact status](generated/relution-policy-workbench/README.md)

## Data handling

Real tenant inventories and exports belong in the ignored `private/` lane. The
historical PDFs recovered for this audit are under
`private/source-pdfs-cache/`; their local README records provenance and licence
constraints. Sanitised findings and evidence hashes may be promoted here after
review, but source PDFs and tenant data must remain untracked.

Relution `.rexp` archives, `.mobileconfig` profiles, certificates, key stores,
environment files, local reports, and decrypted workspaces are ignored by
default. Only explicitly reviewed test/evidence fixtures under `example/` are
public exceptions.

`APPROVED` is a documented decision, `REFERENCE_VALIDATED` is a checked source
reference, and `NOT_EVIDENCED` is an explicit evidence gap. None means a source
is production ready; all policy source records are constrained to `LAB`.
