"""Build unified semantic analysis artifacts across recommendation sources."""

from .unified_analysis_shared import ALL_SOURCES as ALL_SOURCES
from .unified_analysis_shared import AUTHORITATIVE_SOURCE as AUTHORITATIVE_SOURCE
from .unified_analysis_shared import Any as Any
from .unified_analysis_shared import PLATFORM_ORDER as PLATFORM_ORDER
from .unified_analysis_shared import SEMANTIC_INDEX_PATH as SEMANTIC_INDEX_PATH
from .unified_analysis_shared import UNIFIED_ANALYSIS_PATH as UNIFIED_ANALYSIS_PATH
from .unified_analysis_shared import UNIFIED_ANALYSIS_REPORT_PATH as UNIFIED_ANALYSIS_REPORT_PATH
from .unified_analysis_shared import annotations as annotations
from .unified_analysis_shared import count_by as count_by
from .unified_analysis_shared import datetime as datetime
from .unified_analysis_shared import difference_severity_rank as difference_severity_rank
from .unified_analysis_shared import exact_mappings as exact_mappings
from .unified_analysis_shared import flatten_values as flatten_values
from .unified_analysis_shared import load_recommendations_by_global_id as load_recommendations_by_global_id
from .unified_analysis_shared import mapping_target as mapping_target
from .unified_analysis_shared import normalize_policy_platform as normalize_policy_platform
from .unified_analysis_shared import path_to_string as path_to_string
from .unified_analysis_shared import read_json as read_json
from .unified_analysis_shared import semantic_support_level as semantic_support_level
from .unified_analysis_shared import slugify as slugify
from .unified_analysis_shared import source_coverage_counts as source_coverage_counts
from .unified_analysis_shared import source_recommendation_counts as source_recommendation_counts
from .unified_analysis_shared import stable_json as stable_json
from .unified_analysis_shared import sys as sys
from .unified_analysis_shared import timezone as timezone
from .unified_analysis_shared import write_json as write_json

from .unified_analysis_group_01 import build_unified_recommendation_analysis as build_unified_recommendation_analysis
from .unified_analysis_group_01 import write_unified_analysis_report as write_unified_analysis_report
from .unified_analysis_group_02 import build_common_semantic_groups as build_common_semantic_groups
from .unified_analysis_group_02 import add_common_semantic_group_entry as add_common_semantic_group_entry
from .unified_analysis_group_03 import append_unique as append_unique
from .unified_analysis_group_03 import semantic_group_for_entry as semantic_group_for_entry
from .unified_analysis_group_03 import append_group_target_links as append_group_target_links
from .unified_analysis_group_04 import common_semantic_group as common_semantic_group
from .unified_analysis_group_04 import shared_group_targets as shared_group_targets
from .unified_analysis_group_04 import sample_group_recommendations as sample_group_recommendations
from .unified_analysis_group_05 import common_group_sort_key as common_group_sort_key
from .unified_analysis_group_05 import analyze_exact_mapping_differences as analyze_exact_mapping_differences
from .unified_analysis_group_05 import exact_mapping_leaves_by_key as exact_mapping_leaves_by_key
from .unified_analysis_group_05 import constraints_by_path as constraints_by_path
from .unified_analysis_group_06 import exact_value_difference_entry as exact_value_difference_entry
from .unified_analysis_group_06 import exact_leaf_difference_is_hard as exact_leaf_difference_is_hard
from .unified_analysis_group_06 import numeric_constraint_bounds as numeric_constraint_bounds
from .unified_analysis_group_07 import semantic_group_differences as semantic_group_differences

__all__ = [
    "ALL_SOURCES", "AUTHORITATIVE_SOURCE", "Any", "PLATFORM_ORDER", "SEMANTIC_INDEX_PATH",
    "UNIFIED_ANALYSIS_PATH", "UNIFIED_ANALYSIS_REPORT_PATH", "annotations", "count_by", "datetime",
    "difference_severity_rank", "exact_mappings", "flatten_values", "load_recommendations_by_global_id",
    "mapping_target", "normalize_policy_platform", "path_to_string", "read_json", "semantic_support_level",
    "slugify", "source_coverage_counts", "source_recommendation_counts", "stable_json", "sys", "timezone",
    "write_json", "build_unified_recommendation_analysis", "write_unified_analysis_report",
    "build_common_semantic_groups", "add_common_semantic_group_entry", "append_unique", "semantic_group_for_entry",
    "append_group_target_links", "common_semantic_group", "shared_group_targets", "sample_group_recommendations",
    "common_group_sort_key", "analyze_exact_mapping_differences", "exact_mapping_leaves_by_key",
    "constraints_by_path", "exact_value_difference_entry", "exact_leaf_difference_is_hard",
    "numeric_constraint_bounds", "semantic_group_differences",
]
