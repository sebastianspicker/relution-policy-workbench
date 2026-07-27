"""Build change reports and update plans for Relution mapping promotions."""

import hashlib
from typing import Any

from .artifact_io import (
    normalize_policy_platform,
    read_json,
    relative_path,
    stable_json,
    unique_preserving_order,
    update_plan_inputs,
    update_plan_payload,
    write_json,
)
from .artifact_paths import (
    ALL_SOURCES,
    EXACT_MAPPING_REFERENCE_PATH,
    MANUAL_MAPPING_PROMOTIONS_PATH,
    MAPPING_CANDIDATE_REVIEW_PATH,
    PLATFORM_ORDER,
    RELUTION_MAPPING_CHANGE_REPORT_PATH,
    RELUTION_MAPPING_UPDATE_PLAN_PATH,
)
from .artifact_pipeline import (
    optional_dict_entries,
    optional_string_entries,
)
from .mapping_review_artifacts import (
    candidate_review_by_recommendation,
    classify_mapping_update,
    exact_references_by_recommendation,
    required_action_for_confidence_tier,
)
from .ruleset_builder import candidate_target_specs, count_by, mapping_target
from .semantic_review_candidates import (
    bilingual_tokens,
    detect_mapping_language,
    recommendation_semantic_concepts,
    recommendation_source_text,
)

__all__ = [
    "hashlib", "Any", "normalize_policy_platform", "read_json", "relative_path", "stable_json",
    "unique_preserving_order", "update_plan_inputs", "update_plan_payload", "write_json", "ALL_SOURCES",
    "EXACT_MAPPING_REFERENCE_PATH", "MANUAL_MAPPING_PROMOTIONS_PATH", "MAPPING_CANDIDATE_REVIEW_PATH",
    "PLATFORM_ORDER", "RELUTION_MAPPING_CHANGE_REPORT_PATH", "RELUTION_MAPPING_UPDATE_PLAN_PATH",
    "optional_dict_entries", "optional_string_entries", "candidate_review_by_recommendation",
    "classify_mapping_update", "exact_references_by_recommendation", "required_action_for_confidence_tier",
    "candidate_target_specs", "count_by", "mapping_target", "bilingual_tokens", "detect_mapping_language",
    "recommendation_semantic_concepts", "recommendation_source_text",
]

