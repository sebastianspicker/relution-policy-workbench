#!/usr/bin/env python3
"""Compatibility facade for recommendation mapping helpers."""

import sys

from _recommendation_mapping_modules.candidate_inference import (
    android_relution_analog_mappings_for,
    android_relution_candidates_for,
    apple_mobileconfig_candidates_for,
    apple_schema_analog_mappings_for,
    build_setting_index,
    infer_exact_boolean_mapping,
    load_apple_mobileconfig_evidence,
    mapping_candidates,
    semantic_candidates_for,
    semantic_concepts_for,
    semantic_concepts_for_field,
    semantic_evidence_source_records,
    semantic_metadata_for,
    semantic_no_concept_reason,
)
from _recommendation_mapping_modules.field_matching import (
    candidate_from_mapping,
    flatten_value_paths,
    load_windows_custom_csp_evidence,
    merge_candidate_lists,
    split_identifier,
    tokenize,
    unique_preserving_order as _unique_preserving_order,
    windows_custom_csp_mapping_for,
)
from _recommendation_mapping_modules.mapping_types_and_constants import (
    MANAGEMENT_SUPPORT_CONCEPT_IDS,
)


sys.dont_write_bytecode = True

unique_preserving_order = _unique_preserving_order

__all__ = [
    "MANAGEMENT_SUPPORT_CONCEPT_IDS",
    "android_relution_analog_mappings_for",
    "android_relution_candidates_for",
    "apple_mobileconfig_candidates_for",
    "apple_schema_analog_mappings_for",
    "build_setting_index",
    "candidate_from_mapping",
    "flatten_value_paths",
    "infer_exact_boolean_mapping",
    "load_apple_mobileconfig_evidence",
    "load_windows_custom_csp_evidence",
    "mapping_candidates",
    "merge_candidate_lists",
    "semantic_candidates_for",
    "semantic_concepts_for",
    "semantic_concepts_for_field",
    "semantic_evidence_source_records",
    "semantic_metadata_for",
    "semantic_no_concept_reason",
    "split_identifier",
    "tokenize",
    "windows_custom_csp_mapping_for",
]
