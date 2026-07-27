#!/usr/bin/env python3
"""Compatibility facade for CIS benchmark parsing."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from _harvest_cis_benchmarks_modules.cis_benchmarks import BENCHMARKS, BenchmarkSpec, CIS_DIR, PDF_DIR, README_PATH, REPO_ROOT
from _harvest_cis_benchmarks_modules.cis_parser_constants import BASELINE_PATH, CATALOG_PATH, MANIFEST_PATH, RULESET_PATH, SOURCES_PATH, WINDOWS_REXP_EVIDENCE_PATH
from _harvest_cis_benchmarks_modules.cis_parser_core import extract_pdf_text, main, parsed_benchmark_text
from _harvest_cis_benchmarks_modules.cis_parser_core import parse_benchmark as _parse_benchmark
from _harvest_cis_benchmarks_modules.cis_parser_fallbacks import extract_helper_fallbacks
from _harvest_cis_benchmarks_modules.cis_parser_headings import detect_recommendation_starts, is_dotted_number, parse_recommendation_heading
from _harvest_cis_benchmarks_modules.cis_parser_macos_blocks import extract_terminal_commands, split_macos_method_blocks
from _harvest_cis_benchmarks_modules.cis_parser_macos_profiles import extract_macos_helper_fallbacks, extract_profile_keys, extract_profile_payload_type
from _harvest_cis_benchmarks_modules.cis_parser_pages import clean_page_lines, flatten_pages
from _harvest_cis_benchmarks_modules.cis_parser_recommendations import benchmark_recommendation_entry, cis_semantic_candidates_for, cis_semantic_evidence_sources_for, is_windows_helper_only_cis_recommendation
from _harvest_cis_benchmarks_modules.cis_parser_sections import parse_sections
from _harvest_cis_benchmarks_modules.cis_parser_section_text import infer_recommended_value, join_section_text, parse_profile_lines, parse_references
from _harvest_cis_benchmarks_modules.cis_parser_windows import extract_windows_helper_fallbacks, extract_windows_registry_paths, read_windows_registry_path

def parse_benchmark(
    benchmark: BenchmarkSpec,
    field_index: dict[str, list[Any]],
    windows_rexp_evidence: dict[frozenset[str], list[dict[str, Any]]],
    apple_mobileconfig_evidence: dict[str, dict[str, Any]],
    *,
    pdf_text_extractor: Callable[[Path], str] | None = None,
) -> list[dict[str, Any]]:
    """Parse using the facade extractor so callers can monkeypatch it."""
    return _parse_benchmark(
        {
            "benchmark": benchmark,
            "fieldIndex": field_index,
            "windowsRexpEvidence": windows_rexp_evidence,
            "appleMobileconfigEvidence": apple_mobileconfig_evidence,
        },
        pdf_text_extractor=extract_pdf_text if pdf_text_extractor is None else pdf_text_extractor,
    )


__all__ = [
    "BASELINE_PATH", "BENCHMARKS", "BenchmarkSpec", "CATALOG_PATH", "CIS_DIR",
    "PDF_DIR", "README_PATH", "REPO_ROOT", "MANIFEST_PATH", "RULESET_PATH",
    "SOURCES_PATH", "WINDOWS_REXP_EVIDENCE_PATH", "main", "extract_pdf_text",
    "parse_benchmark", "parsed_benchmark_text", "extract_helper_fallbacks",
    "detect_recommendation_starts", "is_dotted_number", "parse_recommendation_heading",
    "extract_terminal_commands", "split_macos_method_blocks",
    "extract_macos_helper_fallbacks", "extract_profile_keys", "extract_profile_payload_type",
    "clean_page_lines", "flatten_pages", "benchmark_recommendation_entry",
    "cis_semantic_candidates_for", "cis_semantic_evidence_sources_for",
    "is_windows_helper_only_cis_recommendation", "parse_sections",
    "infer_recommended_value", "join_section_text", "parse_profile_lines", "parse_references",
    "extract_windows_helper_fallbacks", "extract_windows_registry_paths",
    "read_windows_registry_path",
]
