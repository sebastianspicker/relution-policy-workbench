"""Stable public facade for recommendation normalization helpers."""

from .recommendation_implementation import implementation_for
from .recommendation_implementation_category import implementation_category
from .recommendation_mapping_entries import optional_dict_entries, optional_string_entries, record_mapping_diagnostic, valid_exact_mappings
from .recommendation_normalizer import normalize_fallback_translations, normalize_recommendations, normalize_relution_mapping

__all__ = ["implementation_category", "implementation_for", "normalize_fallback_translations", "normalize_recommendations", "normalize_relution_mapping", "optional_dict_entries", "optional_string_entries", "record_mapping_diagnostic", "valid_exact_mappings"]
