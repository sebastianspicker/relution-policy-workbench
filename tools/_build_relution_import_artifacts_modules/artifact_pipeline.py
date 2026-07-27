"""Stable public facade for generated-artifact pipeline operations."""

from .artifact_coverage import build_coverage_matrix
from .artifact_pipeline_inputs import missing_required_inputs_message, required_recommendation_catalog_paths
from .artifact_semantic_fields import add_field_semantic_links
from .artifact_semantic_index import build_semantic_index
from .artifact_semantic_links import add_catalog_semantic_links, ensure_recommendation_concepts, recommendation_semantic_ids, recommendation_target_links, semantic_recommendation_index_entry
from .recommendation_normalization import implementation_category, implementation_for, normalize_fallback_translations, normalize_recommendations, normalize_relution_mapping, optional_dict_entries, optional_string_entries, record_mapping_diagnostic, valid_exact_mappings
from .unified_analysis import build_unified_recommendation_analysis, exact_leaf_difference_is_hard, write_unified_analysis_report

__all__ = ["add_catalog_semantic_links", "add_field_semantic_links", "build_coverage_matrix", "build_semantic_index", "build_unified_recommendation_analysis", "ensure_recommendation_concepts", "exact_leaf_difference_is_hard", "implementation_category", "implementation_for", "missing_required_inputs_message", "normalize_fallback_translations", "normalize_recommendations", "normalize_relution_mapping", "optional_dict_entries", "optional_string_entries", "recommendation_semantic_ids", "recommendation_target_links", "record_mapping_diagnostic", "required_recommendation_catalog_paths", "semantic_recommendation_index_entry", "valid_exact_mappings", "write_unified_analysis_report"]
