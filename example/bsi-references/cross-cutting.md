# Cross-Cutting BSI References

Verified on `2026-04-23`.

## Primary current-state references

| Title | Date | URL | Why it matters |
| --- | --- | --- | --- |
| IT-Grundschutz | current page | `https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/it-grundschutz.html` | BSI states the current IT-Grundschutz remains applicable during the transition to the new rule-based Grundschutz++ model. |
| Aktuelle Entwicklungen und Ausblick zum IT-Grundschutz | `2025-02-04` | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Veranstaltungen/Grundschutz/1GS_Tag_2025/Aktuelle_Entwicklungen_Ausblick_IT-GS.pdf?__blob=publicationFile&v=2` | Confirms that there was no Edition 2025 release. |
| Errata zum IT-Grundschutz-Kompendium Edition 2023 | `2025-05-05` | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium/errata_2023.pdf?__blob=publicationFile&v=8` | Current corrections that BSI says are verbindlich anzuwenden. |
| Checklisten zum IT-Grundschutz-Kompendium (Edition 2023) | `2025-03-11` | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium/checklisten_2023.html` | Current BSI checklist layer for implementation tracking. |
| IT-Grundschutz-Bausteine (Edition 2023) | Edition 2023 / February 2023 baseline | `https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/IT-Grundschutz-Kompendium/IT-Grundschutz-Bausteine/Bausteine_Download_Edition_node.html` | Canonical index showing the OS-specific bausteine used below. |

## Shared technical bausteine

| Title | Date | URL | Applies to |
| --- | --- | --- | --- |
| SYS.2.1 Allgemeiner Client (Edition 2023) | Edition 2023 / February 2023 baseline | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium_Einzel_PDFs_2023/07_SYS_IT_Systeme/SYS_2_1_Allgemeiner_Client_Edition_2023.pdf` | Windows, macOS |
| SYS.3.2.1 Allgemeine Smartphones und Tablets (Edition 2023) | `2023-02-01` | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium_Einzel_PDFs_2023/07_SYS_IT_Systeme/SYS_3_2_1_Allgemeine_Smartphones_und_Tablets_Edition_2023.pdf` | iOS, Android |
| SYS.3.2.2 Mobile Device Management (MDM) (Edition 2023) | `2023-02-01` | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Grundschutz/IT-GS-Kompendium_Einzel_PDFs_2023/07_SYS_IT_Systeme/SYS_3_2_2_Mobile_Device_Management_Edition_2023.pdf` | iOS, Android |
| Mindeststandard des BSI für Mobile Device Management Version 2.0 | `2022-09-06` | `https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Mindeststandards/Mindeststandard_Mobile-Device-ManagementV2_0.html` | iOS, Android |

## Research conclusion

- There is no newer Edition 2025 or Edition 2026 OS replacement document on the official BSI sources I could verify.
- The current BSI recommendation set is therefore a layered stack:
  - Edition 2023 OS bausteine
  - 2025 errata and checklists
  - current transition guidance for the Grundschutz++ move
  - for mobile platforms, the still-current MDM minimum standard
