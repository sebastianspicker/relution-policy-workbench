# Documentation

The root [README](../README.md) is the primary installation, configuration,
usage, testing, operation, and troubleshooting guide.

## Technical references

- [Frontend conventions](frontend.md): routes, interaction contracts,
  responsive behavior, accessibility, and browser testing.
- [Release procedure](alpha-release.md): source release scope and release
  checks.
- [Apple compatibility matrix](JAMF_RELUTION_APPLE_GAP.md): Apple payloads
  bridged through Relution `APPLE_MOBILECONFIG`.
- [Mapping candidate review](MAPPING_CANDIDATE_REVIEW.md): current non-exact
  mapping queues and promotion rules.
- [MDM reference package](../mdm/README.md): LAB source records, schemas,
  evidence states, runbooks, and output validation.
- [Frontend design reference](../DESIGN.md): current tokens and layout
  conventions.
- [Product scope](../PRODUCT.md): users, workflows, and product boundaries.
- [Security policy](../SECURITY.md): reporting and data boundaries.
- [Contribution guide](../CONTRIBUTING.md): setup, change rules, and
  verification.

## Screenshots

`readme-tour/` contains seven 1440 by 1000 PNG captures used by the root README.
`pnpm screenshots:readme` rebuilds the application and captures them from
deterministic fixtures. Browser visual baselines under `tests/e2e/` are a separate
test surface.

## Private and local files

Do not place tenant exports, decrypted workspaces, credentials, tokens,
certificates, local reports, or source documents in this directory. Use the
ignored `private/`, `reports/`, or `scratch/` lanes as appropriate.
