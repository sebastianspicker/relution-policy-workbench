"""Supports BSI Grundschutz harvesting and recommendation-mapping workflows."""
from __future__ import annotations

import json as _json_reexport
import re
import zipfile as _zipfile_reexport
from pathlib import Path as _Path_reexport
from typing import Any as _Any_reexport

from recommendation_mapping import semantic_candidates_for as _semantic_candidates_for_reexport, semantic_concepts_for as _semantic_concepts_for_reexport, semantic_metadata_for as _semantic_metadata_for_reexport

from .source_parsers import *  # noqa: F401,F403


json = _json_reexport
zipfile = _zipfile_reexport
Path = _Path_reexport
Any = _Any_reexport
semantic_candidates_for = _semantic_candidates_for_reexport
semantic_concepts_for = _semantic_concepts_for_reexport
semantic_metadata_for = _semantic_metadata_for_reexport

def build_errata_map(
    errata_text: str, requirement_ids: set[str]
) -> dict[str, list[dict[str, str]]]:
    """Collect errata excerpts keyed by referenced BSI requirement ID."""
    normalized = normalize_space(errata_text)
    errata: dict[str, list[dict[str, str]]] = {}
    for requirement_id in sorted(requirement_ids):
        matches = list(re.finditer(re.escape(requirement_id), normalized))
        if not matches:
            continue
        excerpts: list[dict[str, str]] = []
        seen = set()
        for match in matches:
            start = max(0, match.start() - 320)
            end = min(len(normalized), match.end() + 520)
            excerpt = normalized[start:end].strip()
            if excerpt in seen:
                continue
            seen.add(excerpt)
            excerpts.append(
                {"sourceId": "it-grundschutz-errata-2023", "excerpt": excerpt}
            )
        errata[requirement_id] = excerpts
    return errata
