# pylint: disable=unused-import
"""Build review artifacts for recommendation-to-Relution mapping changes."""

from datetime import datetime, timezone
import hashlib
from pathlib import Path
from typing import Any

from recommendation_mapping import flatten_value_paths

from .artifact_io import relative_path, update_plan_inputs, update_plan_payload
from .artifact_paths import (
    ALL_SOURCES,
    COVERAGE_MATRIX_PATH,
    EXACT_MAPPING_REFERENCE_PATH,
    MANUAL_MAPPING_PROMOTIONS_PATH,
    MAPPING_CANDIDATE_REVIEW_PATH,
    MAPPING_CANDIDATE_REVIEW_REPORT_PATH,
    PLATFORM_ORDER,
    REPO_ROOT,
    RULESET_UPDATE_PLAN_PATH,
    SEMANTIC_INDEX_PATH,
    SOURCE_CHANGE_REPORT_PATH,
)
from .artifact_io import (
    normalize_policy_platform,
    read_json,
    slugify,
    stable_json,
    write_json,
)
from .mapping_helpers import (
    exact_mappings,
    mapping_target,
)
from recommendation_mapping import (
    unique_preserving_order,
)
from .artifact_pipeline import (
    missing_required_inputs_message,
)
from .manual_mapping_promotions import (  # noqa: F401
    ensure_manual_mapping_promotions_file,
    load_manual_mapping_promotion_entries,
    manual_mapping_promotions_path_label,
    manual_promotion_ruleset_mapping,
    manual_promotion_target_is_valid,
    manual_promotions_by_recommendation,
    validate_manual_mapping_promotion_entry,
    validate_manual_mapping_promotions,
    validated_manual_mapping_platform,
)
from .mapping_candidate_review_output import (
    mapping_candidate_review_row,
    write_mapping_candidate_review_report,
)
from .recommendation_catalog import load_recommendations_by_global_id
from .ruleset_builder import count_by
from .semantic_review_candidates import (  # noqa: F401
    bilingual_tokens,
    count_by_nested_mapping,
    detect_mapping_language,
    exact_mapping_match_evidence,
    extracted_mapping_intent,
    nearest_exact_references,
    ranked_review_candidates,
    recommendation_semantic_concepts,
    recommendation_source_text,
    semantic_review_analysis,
    shorten_review_text,
    suggested_review_action,
)

