"""Compatibility facade for recommendation mapping helpers."""

from .field_matching_apple_mapping import (
    apple_schema_mapping,
    merge_apple_schema_mappings,
)

from .field_matching_apple_merge import (
    merge_without_conflict as merge_without_conflict,
    merge_match_metadata as merge_match_metadata,
)

from .field_matching_text import (
    normalize_search_text,
    phrase_groups_match,
    matched_rule_terms,
    values_from_pairs,
    flatten_leaf_items,
    stable_match_value,
    first_int,
)

from .field_matching_windows_csp import (
    load_windows_custom_csp_evidence,
    windows_custom_csp_mapping_for,
)

from .field_matching_windows_text import (
    windows_policy_signature as windows_policy_signature,
    split_identifier,
    loc_uri_leaf as loc_uri_leaf,
)

from .field_matching_windows_state import (
    is_simple_windows_state as is_simple_windows_state,
    windows_csp_state_matches as windows_csp_state_matches,
    normalize_setting_name as normalize_setting_name,
    normalized_state as normalized_state,
)
from .field_matching_setting_state import extract_setting_state

from .field_matching_boolean import (
    boolean_value_for_field,
    value_compatibility as value_compatibility,
)

from .field_matching_labels import (
    is_exact_label_match,
)

from .field_matching_scoring import (
    score_fields,
    field_allowed as field_allowed,
    has_important_match as has_important_match,
)

from .field_matching_field_score import (
    field_match_score as field_match_score,
)

from .field_matching_relution_catalog import (
    relution_fields,
    relution_platforms as relution_platforms,
)

from .field_matching_relution_platforms import (
    android_relution_platforms as android_relution_platforms,
    apple_relution_platforms as apple_relution_platforms,
)

from .field_matching_apple_catalog import (
    apple_schema_fields,
    apple_platforms as apple_platforms,
)

from .field_matching_tokens import (
    tokenize,
    token_string as token_string,
)

from .field_matching_values import (
    value_at_path,
    flatten_value_paths,
)

from .field_matching_candidates import (
    candidate_from_score,
    candidate_key,
    kind_priority,
    candidate_from_mapping as candidate_from_mapping,
    merge_candidate_lists,
)

from .field_matching_io import (
    read_json,
)

from .field_matching_common import unique_preserving_order

__all__ = [
    'apple_schema_mapping',
    'merge_apple_schema_mappings',
    'relution_fields',
    'apple_schema_fields',
    'candidate_from_score',
    'candidate_key',
    'boolean_value_for_field',
    'extract_setting_state',
    'first_int',
    'flatten_value_paths',
    'flatten_leaf_items',
    'is_exact_label_match',
    'kind_priority',
    'matched_rule_terms',
    'normalize_search_text',
    'phrase_groups_match',
    'read_json',
    'score_fields',
    'stable_match_value',
    'tokenize',
    'unique_preserving_order',
    'value_at_path',
    'values_from_pairs',
    'load_windows_custom_csp_evidence',
    'merge_candidate_lists',
    'split_identifier',
    'windows_custom_csp_mapping_for',
    'android_relution_platforms',
    'apple_platforms',
    'apple_relution_platforms',
    'candidate_from_mapping',
    'field_allowed',
    'field_match_score',
    'has_important_match',
    'is_simple_windows_state',
    'loc_uri_leaf',
    'merge_match_metadata',
    'merge_without_conflict',
    'normalize_setting_name',
    'normalized_state',
    'relution_platforms',
    'token_string',
    'value_compatibility',
    'windows_csp_state_matches',
    'windows_policy_signature',
]
