# Relution Policy Workbench Docs

This directory contains the small public documentation surface that complements
the root README.

## Active Public Documents

- [Jamf / Relution Apple Gap Matrix](JAMF_RELUTION_APPLE_GAP.md): Apple settings that the editor can bridge through Relution `APPLE_MOBILECONFIG`, plus one DDM-only gap.
- [LLM Relution Mapping Review](LLM_RELUTION_MAPPING.md): dated offline BSI, CIS, and vendor recommendation mapping snapshot built from committed evidence.
- [Mapping Candidate Review](MAPPING_CANDIDATE_REVIEW.md): dated non-exact mapping review queues and promotion rules.
- [README tour screenshots](readme-tour/): checked-in screenshots rendered in the root README.

The mapping documents are generated snapshots, not claims about the current
state of their external sources. Their headers record the generation time and,
where applicable, the source snapshot dates.

## Local-Only Material

Planning notes, scratch reports, superseded packets, and generated local check
output are not current project documentation. Store them under the ignored
`docs/archive/`, `reports/`, `private/`, or `scratch/` paths as appropriate.
Never commit real Relution exports, decrypted workspaces, tenant inventories,
credentials, tokens, or archive keys.
