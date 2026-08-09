#!/usr/bin/env python3
"""Compatibility facade for vendor guidance harvesting."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any as Any

from build_relution_import_artifacts import (
    build_source_artifacts as build_source_artifacts,
    manual_promotions_by_recommendation as manual_promotions_by_recommendation,
    normalize_recommendations as normalize_recommendations,
)
from recommendation_mapping import (
    android_relution_analog_mappings_for as android_relution_analog_mappings_for,
    android_relution_candidates_for as android_relution_candidates_for,
    build_setting_index as build_setting_index,
    candidate_from_mapping as candidate_from_mapping,
    load_windows_custom_csp_evidence as load_windows_custom_csp_evidence,
    mapping_candidates as shared_mapping_candidates,
    semantic_candidates_for as semantic_candidates_for,
    semantic_concepts_for as semantic_concepts_for,
)

from _harvest_vendor_guidance_modules.common import (
    REPO_ROOT,
    SAFE_SOURCE_ID_RE as SAFE_SOURCE_ID_RE,
    VENDOR_DIR as VENDOR_DIR,
    WINDOWS_WORKBOOK_PATH as WINDOWS_WORKBOOK_PATH,
    merge_candidate_lists as merge_candidate_lists,
)
from _harvest_vendor_guidance_modules.vendor_mapping_rules import (
    build_baseline_summary as build_baseline_summary,
    build_windows_recommendation as build_windows_recommendation,
    compact_slug as compact_slug,
    read_json as read_json,
    relative_output_path as relative_output_path,
    semantic_metadata_for as semantic_metadata_for,
    update_readme as update_readme,
    vendor_relution_mapping as vendor_relution_mapping,
    vendor_semantic_evidence_sources_for as vendor_semantic_evidence_sources_for,
    workbook_help_by_title as workbook_help_by_title,
    write_json as write_json,
)
from _harvest_vendor_guidance_modules.vendor_source_catalog import (
    CURATED_PLATFORM_GUIDANCE as CURATED_PLATFORM_GUIDANCE,
    WINDOWS_BASELINE_PATH as WINDOWS_BASELINE_PATH,
    WINDOWS_POLICY_RULES_PATH as WINDOWS_POLICY_RULES_PATH,
    WINDOWS_REXP_EVIDENCE_PATH as WINDOWS_REXP_EVIDENCE_PATH,
)
from _harvest_vendor_guidance_modules.vendor_source_content import (
    MAX_VENDOR_DOWNLOAD_BYTES,
    PUBLIC_TOKEN_REDACTIONS,
    TextExtractor,
    download_vendor_source,
    extract_text,
    redact_public_tokens,
)
from _harvest_vendor_guidance_modules.vendor_source_pipeline import (
    build_recommendations,
    harvest_vendor_guidance,
)
from _harvest_vendor_guidance_modules.vendor_source_recommendations import (
    build_curated_recommendation,
    build_recommendations as _build_recommendations,  # noqa: F401
    curated_mapping_context,
    vendor_analog_mappings,
    vendor_exact_mapping,
    vendor_ruleset_mappings,
    vendor_semantic_context,
)
from _harvest_vendor_guidance_modules.vendor_source_refresh import (
    copy_downloads,
    refresh_downloads,
    refresh_vendor_source,
    vendor_source_output_paths,
)
from _harvest_vendor_guidance_modules.vendor_source_safety import (
    resolved_vendor_url_ips,
    safe_vendor_source_id,
    trusted_vendor_source_request,
    validate_vendor_source_url,
    vendor_download_path,
)

__all__ = [
    "CURATED_PLATFORM_GUIDANCE",
    "MAX_VENDOR_DOWNLOAD_BYTES",
    "PUBLIC_TOKEN_REDACTIONS",
    "SAFE_SOURCE_ID_RE",
    "TextExtractor",
    "android_relution_analog_mappings_for",
    "android_relution_candidates_for",
    "build_curated_recommendation",
    "build_recommendations",
    "candidate_from_mapping",
    "compact_slug",
    "copy_downloads",
    "curated_mapping_context",
    "download_vendor_source",
    "extract_text",
    "main",
    "merge_candidate_lists",
    "redact_public_tokens",
    "refresh_downloads",
    "refresh_vendor_source",
    "relative_output_path",
    "resolved_vendor_url_ips",
    "safe_vendor_source_id",
    "semantic_candidates_for",
    "semantic_concepts_for",
    "semantic_metadata_for",
    "shared_mapping_candidates",
    "trusted_vendor_source_request",
    "validate_vendor_source_url",
    "vendor_analog_mappings",
    "vendor_download_path",
    "vendor_exact_mapping",
    "vendor_relution_mapping",
    "vendor_ruleset_mappings",
    "vendor_semantic_context",
    "vendor_semantic_evidence_sources_for",
    "vendor_source_output_paths",
]

sys.dont_write_bytecode = True


def main() -> None:
    """Run the vendor guidance harvester in offline or refresh mode."""

    parser = argparse.ArgumentParser(
        description="Harvest vendor guidance into the repo's normalized recommendation catalog."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--offline",
        action="store_true",
        help="Use the checked-in downloads and derived artifacts.",
    )
    mode.add_argument(
        "--refresh",
        action="store_true",
        help="Download source bodies before rebuilding derived artifacts.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=REPO_ROOT,
        help="Output repository root. Defaults to the current checkout.",
    )
    args = parser.parse_args()
    harvest_vendor_guidance(args.output_root, args.refresh)
