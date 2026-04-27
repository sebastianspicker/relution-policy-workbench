# CIS OS Reference Pack

Scope: current CIS Benchmarks references for Windows, Android, iOS, and macOS, verified on `2026-04-23`.

## Current state

As of `2026-04-23`, the public CIS benchmark family pages show these current OS benchmark lines:

- Windows: `Microsoft Windows 11 Enterprise (5.0.1)`, `Microsoft Windows 11 Stand-alone (5.0.0)`, `Microsoft Windows 10 Enterprise (4.0.0)`, `Microsoft Windows 10 Stand-alone (4.0.0)`
- Android: `Google Android (1.6.0)`
- iOS: `Apple iOS 26 (1.0.0)`, `Apple iOS 18 (2.0.0)`, `Apple iOS 17 (1.1.0)`
- macOS: `Apple macOS 26 Tahoe (1.0.0)`, `Apple macOS 15.0 Sequoia (2.0.0)`, `Apple macOS 14.0 Sonoma (3.0.0)`, `Apple macOS 13.0 Ventura (4.0.0)`

## How to read this pack

- `cross-cutting.md`: CIS sources that apply across multiple operating systems
- `windows.md`: Windows-specific reference stack and dated update trail
- `android.md`: Android-specific reference stack and dated update trail
- `ios.md`: iOS-specific reference stack and dated update trail
- `macos.md`: macOS-specific reference stack and dated update trail
- `sources.json`: machine-readable index of the references in this folder
- `downloads/manifest.json`: local corpus manifest with saved upstream bodies, headers, hashes, and text sidecars
- `downloads/raw/`: saved CIS HTML reference bodies
- `downloads/headers/`: saved response headers for each reference
- `downloads/text/`: extracted plain-text sidecars for local parsing
- `cis-relution-baseline.json`: machine-readable CIS family summary plus harvested PDF coverage, recommendation counts, and helper fallback counts.
- `cis-recommendations.json`: full recommendation catalog harvested from the saved benchmark PDFs, including profile applicability, description/rationale/audit/remediation text, helper fallback methods for Windows/macOS, and Relution mapping metadata.
- `cis-relution-ruleset.json`: importable Relution ruleset that preserves every recommendation as informational metadata and adds only conflict-safe aggregate exact mappings.
- `cis-relution-settings-catalog.json`: machine-readable catalog of exact Relution setting bundles, their provenance, and any explicit variant groups.
- `relution-settings/`: import-ready plain setting JSON bundles grouped by Relution platform and template type for the editor's `Apply JSON` flow.
- `tools/harvest_cis_benchmarks.py`: reproducible extractor for the saved CIS PDF corpus.

## Interpretation notes

- CIS family pages are the best public source for answering "what is current now?" because they list the active benchmark versions directly.
- CIS monthly update posts are the best public source for answering "when did CIS publicly announce a given update?"
- Some Apple 2026 family entries are clearly current on the family pages, but in the public article stream I only surfaced the related March 2026 Build Kit announcement rather than a dedicated benchmark-release post for every Apple 26 entry.
- For iOS and macOS, the benchmark version and Build Kit version can diverge. Example: the iOS family page shows `Apple iOS 18 (2.0.0)` as the current benchmark while the Build Kit line still shows `Apple iOS 18 (1.1.0)`.
