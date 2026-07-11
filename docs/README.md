# Relution Policy Workbench Docs

This directory contains the small public documentation surface that complements
the root README.

## Current Checkout

The 2026-07-11 local checkout is a release-quality frontend alpha plus a Phase
B, LAB-only MDM source contract. The frontend conventions document records the
verified browser boundary; the MDM package records its own measured source and
generated-artifact state. Neither surface is a production-support claim.

## Active Public Documents

- [Jamf / Relution Apple Gap Matrix](JAMF_RELUTION_APPLE_GAP.md): Apple settings that the editor can bridge through Relution `APPLE_MOBILECONFIG`, plus one DDM-only gap.
- [LLM Relution Mapping Review](LLM_RELUTION_MAPPING.md): dated offline BSI, CIS, and vendor recommendation mapping snapshot built from committed evidence.
- [Mapping Candidate Review](MAPPING_CANDIDATE_REVIEW.md): dated non-exact mapping review queues and promotion rules.
- [MDM reference architecture](../mdm/README.md): current LAB-only Apple,
  Windows, and Android policy sources, provenance manifests, deterministic
  Relution 26.1.1 artifacts, and rollout gates.
- [Frontend conventions and support](frontend.md): navigation, responsive pane,
  accessibility, browser, bundle-budget, and alpha support contracts.
- [README tour screenshots](readme-tour/): checked-in screenshots rendered in the root README.

The two mapping-review documents are April 2026 generated snapshots retained as
historical mapping evidence, not claims about current external sources or the
current MDM reference status. Their headers record the generation time and
source snapshot dates. Current Phase B status is maintained under `mdm/`.

## Local-Only Material

Planning notes, scratch reports, superseded packets, and generated local check
output are not current project documentation. Store them under the ignored
`docs/archive/`, `reports/`, `private/`, or `scratch/` paths as appropriate.
Never commit real Relution exports, decrypted workspaces, tenant inventories,
credentials, tokens, or archive keys.

Relution exports, Apple configuration profiles, certificates, and key stores
are ignored globally. The only public `.rexp` files are the explicit reviewed
fixtures under `example/` that support tests and historical comparison.

Public-candidate meta tests reject private-lane files, unapproved `.rexp`
archives, credential/key formats, editor sidecars, environment files, and local
absolute paths. Ignored local data remains outside the public documentation
surface even when it exists in this checkout.
