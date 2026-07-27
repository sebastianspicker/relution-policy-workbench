"""Supports BSI Grundschutz harvesting and recommendation-mapping workflows."""
from __future__ import annotations

import json as _json_reexport
from pathlib import Path as _Path_reexport
from typing import Any

from recommendation_mapping import (
    MANAGEMENT_SUPPORT_CONCEPT_IDS as _MANAGEMENT_SUPPORT_CONCEPT_IDS_reexport,
    android_relution_analog_mappings_for,
    android_relution_candidates_for,
    apple_mobileconfig_candidates_for,
    apple_schema_analog_mappings_for,
    candidate_from_mapping as _candidate_from_mapping_reexport,
    mapping_candidates,
)

from .curated_mapping_rules import MAPPING_RULES as _MAPPING_RULES_reexport, extra_relution_mapping_metadata as _extra_relution_mapping_metadata_reexport
from .source_parsers import *  # noqa: F401,F403


json = _json_reexport
Path = _Path_reexport
MANAGEMENT_SUPPORT_CONCEPT_IDS = _MANAGEMENT_SUPPORT_CONCEPT_IDS_reexport
candidate_from_mapping = _candidate_from_mapping_reexport
MAPPING_RULES = _MAPPING_RULES_reexport
extra_relution_mapping_metadata = _extra_relution_mapping_metadata_reexport

def bsi_inferred_mapping_parts(
    platform: str,
    requirement: dict[str, Any],
    field_index: dict[str, list[Any]],
    apple_mobileconfig_evidence: dict[str, dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Infer candidate and analog mapping evidence for an active BSI requirement."""
    empty = {
        "inferredCandidates": [],
        "androidExactMappings": [],
        "androidCandidates": [],
        "appleExactMappings": [],
        "appleMobileconfigCandidates": [],
    }
    if requirement.get("status") == "retired":
        return empty
    title = str(requirement.get("title", ""))
    extra_texts = (
        str(requirement.get("requirementText", "")),
        str(requirement.get("category", "")),
    )
    return {
        "inferredCandidates": mapping_candidates(
            platform,
            title,
            str(requirement.get("category", "")),
            field_index,
            {"extraTexts": (extra_texts[0],), "limit": 5},
        ),
        "androidExactMappings": android_relution_analog_mappings_for(
            platform, title, None
        ),
        "androidCandidates": android_relution_candidates_for(
            platform, title, extra_texts=extra_texts
        ),
        "appleExactMappings": apple_schema_analog_mappings_for(
            platform, title, None, extra_texts=extra_texts
        ),
        "appleMobileconfigCandidates": apple_mobileconfig_candidates_for(
            platform,
            title,
            extra_texts=extra_texts,
            evidence_index=apple_mobileconfig_evidence,
        ),
    }
