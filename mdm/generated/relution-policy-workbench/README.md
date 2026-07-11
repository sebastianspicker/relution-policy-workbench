# Generated Relution Policy Workbench artifacts

Status: **REFERENCE_VALIDATED LAB artifacts; not production ready**.

The Relution 26.1.1 reference schema is checked in, all 133 required PDFs pass
offline verification, and deterministic LAB rulesets/workspaces are generated.
No Relution Lab import, round trip, physical-device application, rollback, or
production approval is claimed.

The PDF corpus itself is not tracked. The 133-source result describes this
local checkout with its ignored `private/source-pdfs-cache/`; public clones keep
only hashes, normalized evidence, and repository-relative cache locators.

After source verification, `rexp mdm generate` writes one deterministic import
unit per active LAB policy plus a manifest recording source controls, checksum,
prerequisites, manual values, expected create/update behaviour, tested Relution
version/build, validation states and rollback export reference. Production
assignments and secrets remain external. When `RELUTION_REXP_KEY` is supplied,
encrypted archives are written only to ignored `private/mdm-archives/LAB/`;
their randomized ciphertext hashes are deliberately excluded from the
deterministic tracked manifest.
