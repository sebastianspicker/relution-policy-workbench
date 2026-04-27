# Vendor References

This folder contains the current vendor-specific OS guidance corpus that was harvested on `2026-04-23` and converted into Relution-oriented JSON artifacts.

Key files:

- `sources.json`: authoritative source index for Microsoft Windows, Google Android Enterprise, and Apple macOS guidance.
- `downloads/manifest.json`: saved-response manifest with exact local raw body, headers, text sidecar, size, and SHA-256 for every source.
- `downloads/raw/`: exact downloaded source bodies.
- `downloads/extracted/`: unpacked Microsoft Windows baseline archive contents.
- `downloads/derived/windows-24h2-workbook.json`: normalized rows from the Microsoft Windows 11 v24H2 baseline workbook.
- `downloads/derived/windows-24h2-policy-rules.json`: normalized rows from the Microsoft PolicyRules XML.
- `downloads/derived/windows-25h2-intune-baseline.json`: parsed current Windows 11 version 25H2 Intune MDM baseline settings.
- `vendor-recommendations.json`: normalized recommendation catalog with reason text and Relution mapping metadata for every harvested recommendation.
- `tools/harvest_vendor_guidance.py`: repo-local stdlib harvester that can regenerate vendor source artifacts offline from saved downloads and derived baseline rows.
- `vendor-relution-ruleset.json`: importable ruleset JSON for this repo’s ruleset importer. Recommendation-level rules are retained as informational metadata, and merge-safe exact mappings are emitted as actionable aggregate rules.
- `vendor-relution-settings-catalog.json`: machine-readable catalog of exact Relution setting bundles, their provenance, and any explicit variant groups.
- `relution-settings/`: import-ready plain setting JSON bundles grouped by Relution platform and template type for the editor's `Apply JSON` flow.
- `vendor-relution-baseline.json`: summary metadata, guidance model, and artifact pointers.

Current corpus summary:

- Sources harvested: `25`
- Recommendations extracted: `518`
- Platform counts:
  - `WINDOWS`: `480`
  - `ANDROID`: `19`
  - `MACOS`: `19`

Import notes:

- The recommendation catalog uses OS-family platform labels: `WINDOWS`, `ANDROID`, `MACOS`.
- The importable ruleset uses the actual Relution platform string `ANDROID_ENTERPRISE` for actionable Android mappings because that is the concrete Relution native surface available in this repo.
- Not every vendor recommendation has a direct Relution equivalent. Unmappable or mutually exclusive recommendations remain in the catalog and in the importable ruleset as informational rules with mapping candidates and source provenance preserved.
