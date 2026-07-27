"""Build BSI recommendation catalogs, baselines, and rulesets."""

from __future__ import annotations

import json as _json_reexport
from pathlib import Path as _Path_reexport
from typing import Any

from recommendation_mapping import (
    MANAGEMENT_SUPPORT_CONCEPT_IDS as _MANAGEMENT_SUPPORT_CONCEPT_IDS_reexport,
    android_relution_analog_mappings_for as _android_relution_analog_mappings_for_reexport,
    android_relution_candidates_for as _android_relution_candidates_for_reexport,
    apple_mobileconfig_candidates_for as _apple_mobileconfig_candidates_for_reexport,
    apple_schema_analog_mappings_for as _apple_schema_analog_mappings_for_reexport,
    candidate_from_mapping as _candidate_from_mapping_reexport,
    mapping_candidates as _mapping_candidates_reexport,
)

from .curated_mapping_rules import MAPPING_RULES, extra_relution_mapping_metadata
from .source_parsers import (
    BASELINE_PATH as _BASELINE_PATH_reexport,
    BSI_DIR as _BSI_DIR_reexport,
    CHECKLIST_COMPARISON_PATH as _CHECKLIST_COMPARISON_PATH_reexport,
    GS_PLUSPLUS_SYSTEMATICS_PATH as _GS_PLUSPLUS_SYSTEMATICS_PATH_reexport,
    PLATFORM_TARGETS as _PLATFORM_TARGETS_reexport,
    README_PATH as _README_PATH_reexport,
    relative_repo_path as _relative_repo_path_reexport,
)



from .bsi_mapping_inference import bsi_inferred_mapping_parts
from .bsi_mapping_selection import bsi_exact_override, bsi_mapping_without_curated_rule
from .bsi_mapping_candidates import merge_candidates
from .bsi_mapping_inference import *  # noqa: F401,F403
from .bsi_mapping_selection import *  # noqa: F401,F403
from .bsi_mapping_candidates import *  # noqa: F401,F403
from .bsi_ruleset_artifacts import *  # noqa: F401,F403


json = _json_reexport
Path = _Path_reexport
MANAGEMENT_SUPPORT_CONCEPT_IDS = _MANAGEMENT_SUPPORT_CONCEPT_IDS_reexport
android_relution_analog_mappings_for = _android_relution_analog_mappings_for_reexport
android_relution_candidates_for = _android_relution_candidates_for_reexport
apple_mobileconfig_candidates_for = _apple_mobileconfig_candidates_for_reexport
apple_schema_analog_mappings_for = _apple_schema_analog_mappings_for_reexport
candidate_from_mapping = _candidate_from_mapping_reexport
mapping_candidates = _mapping_candidates_reexport
BASELINE_PATH = _BASELINE_PATH_reexport
BSI_DIR = _BSI_DIR_reexport
CHECKLIST_COMPARISON_PATH = _CHECKLIST_COMPARISON_PATH_reexport
GS_PLUSPLUS_SYSTEMATICS_PATH = _GS_PLUSPLUS_SYSTEMATICS_PATH_reexport
PLATFORM_TARGETS = _PLATFORM_TARGETS_reexport
README_PATH = _README_PATH_reexport
relative_repo_path = _relative_repo_path_reexport

def mapping_for(context: dict[str, Any]) -> dict[str, Any]:
    """Build Relution mapping metadata for one BSI requirement context."""
    platform = context["platform"]
    requirement_id = context["requirementId"]
    requirement = context["requirement"]
    field_index = context["fieldIndex"]
    apple_mobileconfig_evidence = context["appleMobileconfigEvidence"]
    semantic_candidates = context["semanticCandidates"]
    mapping = MAPPING_RULES.get((platform, requirement_id))
    inferred = bsi_inferred_mapping_parts(
        platform, requirement, field_index, apple_mobileconfig_evidence
    )
    if mapping is None:
        return bsi_mapping_without_curated_rule(inferred, semantic_candidates)
    override = bsi_exact_override(mapping, inferred, semantic_candidates)
    if override is not None:
        return override
    notes = mapping["notes"]
    if mapping["status"] == "none" and semantic_candidates:
        notes = [
            (
                "BSI/GS++ concept matching found related Relution targets, but exact "
                "remediation requires concrete values and scoped policy decisions."
            )
        ]
    return {
        "status": "partial"
        if mapping["status"] == "none" and semantic_candidates
        else mapping["status"],
        "mergeableInImportableRuleset": mapping["mergeableInImportableRuleset"],
        "candidates": merge_candidates(
            mapping["candidates"],
            [
                *semantic_candidates,
                *inferred["androidCandidates"],
                *inferred["appleMobileconfigCandidates"],
                *inferred["inferredCandidates"],
            ],
        ),
        "rulesetMappings": mapping["rulesetMappings"],
        "notes": notes,
        **extra_relution_mapping_metadata(mapping),
    }
