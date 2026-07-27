"""Supports BSI Grundschutz harvesting and recommendation-mapping workflows."""
from __future__ import annotations

from typing import Any


from .bsi_legacy_reexports import common_legacy_reexports
from .source_parsers import *  # noqa: F401,F403


(
    json,
    re,
    zipfile,
    Path,
    semantic_candidates_for,
    semantic_concepts_for,
    semantic_metadata_for,
) = common_legacy_reexports()

def parse_plusplus_practice_groups(
    groups: list[Any], controls: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Summarize GS++ top-level practices and their child control groups."""
    controls_by_practice: dict[str, list[dict[str, Any]]] = {}
    for control in controls:
        controls_by_practice.setdefault(str(control["practiceId"]), []).append(control)
    parsed: list[dict[str, Any]] = []
    for group in groups:
        if not isinstance(group, dict):
            continue
        practice_id = str(group.get("id", ""))
        child_groups = []
        for child in group.get("groups", []):
            if not isinstance(child, dict):
                continue
            child_id = str(child.get("id", ""))
            child_groups.append(
                {
                    "id": child_id,
                    "title": str(child.get("title", "")),
                    "controlCount": sum(
                        1
                        for control in controls_by_practice.get(practice_id, [])
                        if control.get("controlGroupId") == child_id
                    ),
                }
            )
        parsed.append(
            {
                "id": practice_id,
                "title": str(group.get("title", "")),
                "remarks": prop_remark(group.get("props", []), "label"),
                "controlCount": len(controls_by_practice.get(practice_id, [])),
                "groups": child_groups,
            }
        )
    return parsed
