"""Compatibility facade for CIS-to-Relution mapping rules."""
from __future__ import annotations

from recommendation_mapping import candidate_from_mapping
from _harvest_cis_benchmarks_modules.common import build_helper_fallback, extract_excerpt, extract_powershell_commands, is_terminal_stop_line, normalize_space, slugify, trim_at_markers, unique_preserving_order, unique_profile_keys, write_json
from _harvest_cis_benchmarks_modules.mapping_outputs import build_baseline_summary, update_readme
from _harvest_cis_benchmarks_modules.cis_mapping_accumulator import add_candidate, add_exact, add_mapping
from _harvest_cis_benchmarks_modules.cis_mapping_aggregate import build_aggregate_rules
from _harvest_cis_benchmarks_modules.cis_mapping_analog import add_analog_mappings
from _harvest_cis_benchmarks_modules.cis_mapping_android import add_android_curated_mapping
from _harvest_cis_benchmarks_modules.cis_mapping_core import mapping_for
from _harvest_cis_benchmarks_modules.cis_mapping_curated import add_curated_exact_mappings
from _harvest_cis_benchmarks_modules.cis_mapping_ios_passwords import add_minimum_ios_password_length, ios_password_proximity_disabled, ios_password_sharing_disabled, phrase_value_matches
from _harvest_cis_benchmarks_modules.cis_mapping_ios_primary import add_ios_curated_mapping
from _harvest_cis_benchmarks_modules.cis_mapping_ios_special import add_ios_icloud_mapping, add_ios_special_mapping
from _harvest_cis_benchmarks_modules.cis_mapping_macos import add_macos_curated_mapping
from _harvest_cis_benchmarks_modules.cis_mapping_ruleset import build_ruleset
from _harvest_cis_benchmarks_modules.cis_mapping_suggestions import merge_candidates, suggested_mapping_response
from _harvest_cis_benchmarks_modules.cis_mapping_support import add_windows_rexp_mapping
from _harvest_cis_benchmarks_modules.cis_mapping_windows import add_windows_defender_mapping, add_windows_standalone_mapping

__all__ = [
    "build_baseline_summary", "build_helper_fallback", "extract_excerpt",
    "extract_powershell_commands", "is_terminal_stop_line", "mapping_for",
    "normalize_space", "slugify", "trim_at_markers", "unique_preserving_order",
    "unique_profile_keys", "update_readme", "write_json",
    "candidate_from_mapping", "add_candidate", "add_exact", "add_mapping",
    "build_aggregate_rules", "add_analog_mappings", "add_android_curated_mapping",
    "add_curated_exact_mappings", "add_minimum_ios_password_length",
    "ios_password_proximity_disabled", "ios_password_sharing_disabled",
    "phrase_value_matches", "add_ios_curated_mapping", "add_ios_icloud_mapping",
    "add_ios_special_mapping", "add_macos_curated_mapping", "build_ruleset",
    "merge_candidates", "suggested_mapping_response", "add_windows_rexp_mapping",
    "add_windows_defender_mapping", "add_windows_standalone_mapping",
]
