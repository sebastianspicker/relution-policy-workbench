"""Shared constants for BSI harvest parsers."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from defusedxml import ElementTree as ET

from .bsi_platform_targets import (
    GS_PLUSPLUS_METHOD_CONTEXT as _GS_PLUSPLUS_METHOD_CONTEXT_reexport,
    GS_PLUSPLUS_RELATED_CONTROL_RULES as _GS_PLUSPLUS_RELATED_CONTROL_RULES_reexport,
    GS_PLUSPLUS_STOPWORDS as _GS_PLUSPLUS_STOPWORDS_reexport,
    MAPPING_RULES as _MAPPING_RULES_reexport,
    ModuleTarget as _ModuleTarget_reexport,
    PlatformTarget as _PlatformTarget_reexport,
    PLATFORM_GS_PLUSPLUS_TARGET_CATEGORIES as _PLATFORM_GS_PLUSPLUS_TARGET_CATEGORIES_reexport,
    PLATFORM_TARGETS as _PLATFORM_TARGETS_reexport,
)

DOCBOOK_NS = {"db": "http://docbook.org/ns/docbook"}
SHEET_NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RELATIONSHIP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_RELATIONSHIP_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
REPO_ROOT = Path(__file__).resolve().parents[2]
BSI_DIR = REPO_ROOT / "example" / "bsi-references"
XML_PATH = BSI_DIR / "downloads" / "pdf-xlsx-html" / "XML_Kompendium_2023.xml"
XLSX_PATH = BSI_DIR / "downloads" / "pdf-xlsx-html" / "krt2023_Excel.xlsx"
INDIVIDUAL_CHECKLISTS_DIR = BSI_DIR / "downloads" / "pdf-xlsx-html" / "Checklisten zum IT-Grundschutz-Kompendium (Edition 2023)"
ERRATA_TEXT_PATH = BSI_DIR / "downloads" / "text" / "it-grundschutz-errata-2023.txt"
GS_PLUSPLUS_CATALOG_PATH = BSI_DIR / "downloads" / "pdf-xlsx-html" / "Grundschutz++-catalog.json"
GS_PLUSPLUS_METHOD_PATH = BSI_DIR / "downloads" / "pdf-xlsx-html" / "Methodik_Grundschutz_PlusPlus.pdf"
BASELINE_PATH = BSI_DIR / "bsi-relution-baseline.json"
README_PATH = BSI_DIR / "README.md"
CATALOG_PATH = BSI_DIR / "bsi-recommendations.json"
RULESET_PATH = BSI_DIR / "bsi-relution-ruleset.json"
GS_PLUSPLUS_SYSTEMATICS_PATH = BSI_DIR / "bsi-grundschutz-plusplus-systematics.json"
CHECKLIST_COMPARISON_PATH = BSI_DIR / "bsi-grundschutz-kompendium-checklist-comparison.json"
CELL_REF_RE = re.compile(r"(?P<column>[A-Z]+)")

if not hasattr(ET, "Element"):
    ET.Element = Any  # type: ignore[attr-defined]

GS_PLUSPLUS_METHOD_CONTEXT = _GS_PLUSPLUS_METHOD_CONTEXT_reexport
GS_PLUSPLUS_RELATED_CONTROL_RULES = _GS_PLUSPLUS_RELATED_CONTROL_RULES_reexport
GS_PLUSPLUS_STOPWORDS = _GS_PLUSPLUS_STOPWORDS_reexport
MAPPING_RULES = _MAPPING_RULES_reexport
ModuleTarget = _ModuleTarget_reexport
PlatformTarget = _PlatformTarget_reexport
PLATFORM_GS_PLUSPLUS_TARGET_CATEGORIES = _PLATFORM_GS_PLUSPLUS_TARGET_CATEGORIES_reexport
PLATFORM_TARGETS = _PLATFORM_TARGETS_reexport
