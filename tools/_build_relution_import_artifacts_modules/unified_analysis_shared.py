"""Build unified semantic analysis artifacts across recommendation sources."""

from __future__ import annotations

from datetime import datetime, timezone
import sys
from typing import Any

from .artifact_io import (
    normalize_policy_platform,
    path_to_string,
    read_json,
    slugify,
    stable_json,
    write_json,
)
from .artifact_paths import (
    ALL_SOURCES,
    AUTHORITATIVE_SOURCE,
    PLATFORM_ORDER,
    SEMANTIC_INDEX_PATH,
    UNIFIED_ANALYSIS_PATH,
    UNIFIED_ANALYSIS_REPORT_PATH,
)
from .mapping_helpers import exact_mappings, mapping_target
from .recommendation_catalog import load_recommendations_by_global_id
from .ruleset_builder import (
    count_by,
    difference_severity_rank,
    flatten_values,
    semantic_support_level,
    source_coverage_counts,
    source_recommendation_counts,
)

__all__ = [
    "datetime", "timezone", "sys", "Any", "normalize_policy_platform", "path_to_string", "read_json",
    "slugify", "stable_json", "write_json", "ALL_SOURCES", "AUTHORITATIVE_SOURCE", "PLATFORM_ORDER",
    "SEMANTIC_INDEX_PATH", "UNIFIED_ANALYSIS_PATH", "UNIFIED_ANALYSIS_REPORT_PATH", "exact_mappings",
    "mapping_target", "load_recommendations_by_global_id", "count_by", "difference_severity_rank",
    "flatten_values", "semantic_support_level", "source_coverage_counts", "source_recommendation_counts",
]

