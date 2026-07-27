"""Compatibility facade for recommendation mapping helpers."""

from .candidate_inference_index import (
    build_setting_index,
    mapping_candidates,
    scored_candidate_fields as scored_candidate_fields,
    prepend_exact_mapping_candidates as prepend_exact_mapping_candidates,
)

from .candidate_inference_exact import (
    infer_exact_boolean_mapping,
    best_exact_boolean_match as best_exact_boolean_match,
    exact_boolean_mapping_for_match as exact_boolean_mapping_for_match,
)

from .candidate_inference_apple_analog import (
    apple_schema_analog_mappings_for,
    apple_analog_rule_mapping as apple_analog_rule_mapping,
    append_unique_apple_mappings as append_unique_apple_mappings,
    apple_mapping_key as apple_mapping_key,
    curated_analog_context as curated_analog_context,
)

from .candidate_inference_apple_mobileconfig import (
    apple_mobileconfig_candidates_for,
    load_apple_mobileconfig_evidence,
)

from .candidate_inference_android import (
    android_relution_analog_mappings_for,
    android_relution_candidates_for,
    android_relution_mapping as android_relution_mapping,
)

from .candidate_inference_semantic_concepts import (
    semantic_concepts_for,
)

from .candidate_inference_semantic_matching import (
    semantic_rule_matches as semantic_rule_matches,
    semantic_source_match as semantic_source_match,
)

from .candidate_inference_semantic_sources import (
    normalized_semantic_sources as normalized_semantic_sources,
    matched_semantic_terms as matched_semantic_terms,
    semantic_source_confidence as semantic_source_confidence,
    is_process_only_evidence as is_process_only_evidence,
    shorten_text as shorten_text,
)
from .candidate_inference_semantic_evidence import semantic_source_evidence as semantic_source_evidence

from .candidate_inference_semantic_candidates import (
    semantic_candidates_for,
    semantic_candidate_targets_for as semantic_candidate_targets_for,
    semantic_candidate_sort_key as semantic_candidate_sort_key,
)

from .candidate_inference_semantic_output import (
    semantic_concepts_for_field,
    semantic_no_concept_reason,
    semantic_metadata_for,
    semantic_evidence_source_records,
    semantic_concept_sort_key as semantic_concept_sort_key,
    semantic_concept_source_rank as semantic_concept_source_rank,
)

from .candidate_inference_apple_numeric import (
    apple_numeric_analog_mappings_for as apple_numeric_analog_mappings_for,
    ios_numeric_analog_mappings as ios_numeric_analog_mappings,
)

from .candidate_inference_apple_numeric_macos import (
    macos_numeric_analog_mappings as macos_numeric_analog_mappings,
)

__all__ = [
    'android_relution_analog_mappings_for',
    'android_relution_candidates_for',
    'apple_mobileconfig_candidates_for',
    'apple_schema_analog_mappings_for',
    'build_setting_index',
    'infer_exact_boolean_mapping',
    'load_apple_mobileconfig_evidence',
    'mapping_candidates',
    'semantic_candidates_for',
    'semantic_concepts_for',
    'semantic_concepts_for_field',
    'semantic_evidence_source_records',
    'semantic_metadata_for',
    'semantic_no_concept_reason',
    'android_relution_mapping',
    'append_unique_apple_mappings',
    'apple_analog_rule_mapping',
    'apple_mapping_key',
    'apple_numeric_analog_mappings_for',
    'best_exact_boolean_match',
    'curated_analog_context',
    'exact_boolean_mapping_for_match',
    'ios_numeric_analog_mappings',
    'is_process_only_evidence',
    'macos_numeric_analog_mappings',
    'matched_semantic_terms',
    'normalized_semantic_sources',
    'prepend_exact_mapping_candidates',
    'scored_candidate_fields',
    'semantic_candidate_sort_key',
    'semantic_candidate_targets_for',
    'semantic_concept_sort_key',
    'semantic_concept_source_rank',
    'semantic_rule_matches',
    'semantic_source_confidence',
    'semantic_source_evidence',
    'semantic_source_match',
    'shorten_text',
]
