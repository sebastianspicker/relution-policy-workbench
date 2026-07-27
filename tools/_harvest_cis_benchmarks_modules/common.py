"""Compatibility facade for CIS benchmark metadata and helper utilities."""
from __future__ import annotations

from _harvest_cis_benchmarks_modules.cis_benchmarks import BENCHMARKS, BenchmarkDetails, BenchmarkSpec, CIS_DIR, PDF_DIR, README_PATH, REPO_ROOT
from _harvest_cis_benchmarks_modules.cis_text_collections import normalize_space, unique_preserving_order, unique_profile_keys
from _harvest_cis_benchmarks_modules.cis_text_commands import build_helper_fallback, extract_excerpt, extract_powershell_commands, is_terminal_stop_line, trim_at_markers
from _tooling_text_io import slugify, write_json

__all__ = [
    "BENCHMARKS", "BenchmarkDetails", "BenchmarkSpec", "CIS_DIR", "PDF_DIR",
    "README_PATH", "REPO_ROOT", "build_helper_fallback", "extract_excerpt",
    "extract_powershell_commands", "is_terminal_stop_line", "normalize_space",
    "slugify", "trim_at_markers", "unique_preserving_order", "unique_profile_keys",
    "write_json",
]
