# Product scope

## Users

REXP Studio is intended for MDM engineers, security administrators, and
technical operators who work with Relution policy archives, Apple payloads,
baseline references, compliance reports, and device audit data.

## Primary workflow

The product supports a local workflow from archive inspection through policy
editing, validation, and archive rebuilding. The browser workbench keeps the
selected policy, configuration data, validation state, and output actions in
one local session.

The product is not a Relution administration console. Production Relution
access is read-only. Local policy output must be reviewed and imported through
an authorized external process.

## Supported surfaces

- archive CLI for inspection, extraction, verification, and packing
- loopback browser editor for local workspaces
- Relution 26.1.1 template and schema reference data
- Apple profile, DDM, and MDM command authoring
- baseline and recommendation review
- local compliance evaluation and report output
- read-only Relution device queries
- optional Zammad ticket creation
- offline LAB MDM source and output validation

## Product boundaries

- No hosted or non-loopback editor listener is supported.
- No production Relution write operation is provided.
- Reference data does not establish tenant compatibility or device behavior.
- MDM source files and outputs are LAB-only until separate evidence and approval
  exist.
- DDM and MDM command drafts remain sidecar data outside `.rexp` archives.
- Browser automation does not replace manual accessibility, service, or device
  testing.

## Interface principles

- Keep local state and remote state distinguishable.
- Keep destructive and external actions explicit.
- Show validation and evidence limits next to the affected operation.
- Preserve raw identifiers and data needed for technical diagnosis.
- Maintain complete keyboard and narrow-layout access.
- Avoid decorative elements that compete with policy and evidence data.
