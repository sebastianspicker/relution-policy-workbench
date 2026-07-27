"""Compatibility facade for vendor guidance mapping rules."""

from recommendation_mapping import semantic_metadata_for as semantic_metadata_for

from _harvest_vendor_guidance_modules.vendor_mapping_artifacts import (
    build_baseline_summary,
    source_roles,
    update_readme,
)
from _harvest_vendor_guidance_modules.vendor_mapping_candidates import (
    flatten_value_paths,
    mapping_candidates,
)
from _harvest_vendor_guidance_modules.vendor_mapping_index import build_field_index
from _harvest_vendor_guidance_modules.vendor_mapping_semantic import (
    vendor_mapping_status,
    vendor_relution_mapping,
    vendor_semantic_evidence_sources_for,
    workbook_help_by_title,
)
from _harvest_vendor_guidance_modules.vendor_mapping_text import (
    compact_slug,
    normalize_text,
    read_json,
    relative_output_path,
    tokenize,
    write_json,
)
from _harvest_vendor_guidance_modules.vendor_windows_mapping import (
    build_windows_recommendation,
    inferred_windows_exact_mappings,
    windows_mapping_context,
    windows_mapping_tuple,
    windows_ruleset_mappings,
    windows_semantic_evidence_sources,
    windows_source_context,
)

__all__ = [
    "build_baseline_summary",
    "build_field_index",
    "build_windows_recommendation",
    "compact_slug",
    "flatten_value_paths",
    "inferred_windows_exact_mappings",
    "mapping_candidates",
    "normalize_text",
    "read_json",
    "relative_output_path",
    "semantic_metadata_for",
    "source_roles",
    "tokenize",
    "update_readme",
    "vendor_mapping_status",
    "vendor_relution_mapping",
    "vendor_semantic_evidence_sources_for",
    "windows_mapping_context",
    "windows_mapping_tuple",
    "windows_ruleset_mappings",
    "windows_semantic_evidence_sources",
    "windows_source_context",
    "workbook_help_by_title",
    "write_json",
]
