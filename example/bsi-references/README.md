# BSI OS Reference Pack

Scope: current BSI references for Windows, Android, iOS, and macOS, verified on `2026-04-23`.

## Current baseline

As of `2026-04-23`, the operative BSI baseline is still the IT-Grundschutz material around Edition 2023.

- The current IT-Grundschutz page states that the current IT-Grundschutz remains applicable during the multi-year transition to the new digital rule set:
  `https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/it-grundschutz.html`
- BSI's `1. IT-Grundschutz-Tag 2025` slide deck explicitly says there was no Edition 2025 release:
  `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Veranstaltungen/Grundschutz/1GS_Tag_2025/Aktuelle_Entwicklungen_Ausblick_IT-GS.pdf?__blob=publicationFile&v=2`
- For operational use, pair the OS modules with the later Edition 2023 update material:
  - `Errata zum IT-Grundschutz-Kompendium Edition 2023`, stand `2025-05-05`
  - `Checklisten zum IT-Grundschutz-Kompendium (Edition 2023)`, Datum `2025-03-11`

## How to read this pack

- `cross-cutting.md`: sources that apply across multiple operating systems
- `windows.md`: Windows-specific reference stack
- `macos.md`: macOS-specific reference stack
- `ios.md`: iOS-specific reference stack
- `android.md`: Android-specific reference stack
- `sources.json`: machine-readable index of all references in this folder
- `downloads/manifest.json`: downloaded corpus manifest with local file paths, hashes, content types, and extracted text sidecars
- `downloads/raw/`: saved upstream BSI HTML/PDF reference bodies
- `downloads/headers/`: saved response headers for each downloaded source
- `downloads/text/`: extracted text sidecars for local parsing
- `bsi-relution-baseline.json`: consolidated 2023 baseline plus 2025 errata/checklist layer, normalized for Relution-oriented consumption
- `bsi-grundschutz-kompendium-checklist-comparison.json`: parsed individual 2023 checklist workbooks, comparison against the OS baustein corpus, and policy-relevant APP/OPS/SYS checklist requirements used as enrichment evidence.
- `bsi-grundschutz-plusplus-systematics.json`: parsed 2026 Grundschutz++ OSCAL catalog plus Methodik-derived process, modal-verb, security-level, target-category, and policy-editor context.
- `bsi-recommendations.json`: per-platform BSI Grundschutz recommendation catalog derived from the saved DocBook XML and checklist workbook, including threat linkage, errata overlays, and Relution mapping metadata.
- `bsi-relution-ruleset.json`: importable Relution ruleset built from the active BSI requirements. Only exact Relution mappings are actionable; the rest stay informational with preserved metadata.
- `bsi-relution-settings-catalog.json`: machine-readable catalog of exact Relution setting bundles, their provenance, and any explicit variant groups.
- `relution-settings/`: import-ready plain setting JSON bundles grouped by Relution platform and template type for the editor's `Apply JSON` flow.
- `tools/harvest_bsi_grundschutz.py`: reproducible extractor for the local BSI XML/XLSX/text corpus.

## Practical interpretation

- Windows and macOS should be read as `general client + OS-specific client baustein + 2025 errata/checklists`.
- iOS and Android should be read as `general smartphones/tablets + MDM + OS-specific mobile baustein + MDM minimum standard + 2025 errata/checklists`.
- Where BSI still lists an older `Umsetzungshinweis` edition, I kept it if it is still the currently listed implementation guidance.
- `semanticConcepts` are a deterministic bilingual normalization layer for candidate discovery. They preserve German BSI/GS++ source text and map terms such as `Verschluesselung`, `Firewall`, or `Berechtigungen` to candidate Relution, Apple profile/mobileconfig, Android Enterprise, and Windows CSP surfaces.
- Concept-derived candidates are evidence only. They do not prove compliance, do not create exact remediation, and do not become importable unless a separate curated exact mapping with concrete values exists.

## Download notes

- The downloaded corpus stores the exact response body returned by the referenced URL.
- Some BSI baustein URLs referenced in `sources.json` resolve to HTML landing pages instead of direct PDF bodies. In those cases the corpus stores the HTML page plus an extracted text sidecar.
- The consolidated JSON in `bsi-relution-baseline.json` is the intended machine-readable input for downstream parsing and Relution-side mapping.
