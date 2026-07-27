"""Supports BSI Grundschutz harvesting and recommendation-mapping workflows."""
from __future__ import annotations

import json as _json_reexport
from pathlib import Path as _Path_reexport
from typing import Any

from recommendation_mapping import (
    MANAGEMENT_SUPPORT_CONCEPT_IDS,
    android_relution_analog_mappings_for as _android_relution_analog_mappings_for_reexport,
    android_relution_candidates_for as _android_relution_candidates_for_reexport,
    apple_mobileconfig_candidates_for as _apple_mobileconfig_candidates_for_reexport,
    apple_schema_analog_mappings_for as _apple_schema_analog_mappings_for_reexport,
    candidate_from_mapping as _candidate_from_mapping_reexport,
    mapping_candidates as _mapping_candidates_reexport,
)

from .curated_mapping_rules import MAPPING_RULES as _MAPPING_RULES_reexport, extra_relution_mapping_metadata as _extra_relution_mapping_metadata_reexport
from .source_parsers import *  # noqa: F401,F403


json = _json_reexport
Path = _Path_reexport
android_relution_analog_mappings_for = _android_relution_analog_mappings_for_reexport
android_relution_candidates_for = _android_relution_candidates_for_reexport
apple_mobileconfig_candidates_for = _apple_mobileconfig_candidates_for_reexport
apple_schema_analog_mappings_for = _apple_schema_analog_mappings_for_reexport
candidate_from_mapping = _candidate_from_mapping_reexport
mapping_candidates = _mapping_candidates_reexport
MAPPING_RULES = _MAPPING_RULES_reexport
extra_relution_mapping_metadata = _extra_relution_mapping_metadata_reexport

def merge_candidates(
    existing: list[dict[str, Any]], inferred: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Merge candidate rows by kind and target while preserving useful field paths."""
    merged: list[dict[str, Any]] = []
    seen: dict[tuple[str, str], dict[str, Any]] = {}
    ordered_existing = (
        sorted(existing, key=candidate_sort_key)
        if any("semanticConceptId" in candidate for candidate in existing)
        else existing
    )
    for candidate in [*ordered_existing, *sorted(inferred, key=candidate_sort_key)]:
        key = (str(candidate.get("kind", "")), str(candidate.get("target", "")))
        if key in seen:
            merge_candidate_field_paths(seen[key], candidate)
            continue
        stored = dict(candidate)
        stored["fieldPaths"] = [
            str(path)
            for path in candidate.get("fieldPaths", [])
            if isinstance(path, str)
        ]
        seen[key] = stored
        merged.append(stored)
    return merged[:8]


def candidate_sort_key(candidate: dict[str, Any]) -> tuple[int, int, str, str]:
    """Sort stronger curated and semantic candidates ahead of weak name matches."""
    match = candidate.get("match", {})
    compatibility = (
        str(match.get("valueCompatibility", "")) if isinstance(match, dict) else ""
    )
    score = int(match.get("score", 0)) if isinstance(match, dict) else 0
    concept_id = str(candidate.get("semanticConceptId", ""))
    if compatibility in {"curated-analog", "curated-android-analog"}:
        band = 0
    elif compatibility == "concept-candidate":
        band = 3 if concept_id in MANAGEMENT_SUPPORT_CONCEPT_IDS else 2
    else:
        band = 1
    return (
        band,
        -score,
        str(candidate.get("kind", "")),
        str(candidate.get("target", "")),
    )


def merge_candidate_field_paths(
    existing: dict[str, Any], duplicate: dict[str, Any]
) -> None:
    """Append unique field paths from a duplicate candidate into the stored row."""
    paths = [
        str(path) for path in existing.get("fieldPaths", []) if isinstance(path, str)
    ]
    seen = set(paths)
    for path in duplicate.get("fieldPaths", []):
        if not isinstance(path, str) or path in seen:
            continue
        seen.add(path)
        paths.append(path)
    existing["fieldPaths"] = paths
