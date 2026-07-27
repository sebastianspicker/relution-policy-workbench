"""Core orchestration for CIS benchmark parsing."""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path
from typing import Any, Callable

from build_relution_import_artifacts import build_source_artifacts
from recommendation_mapping import build_setting_index, load_apple_mobileconfig_evidence, load_windows_custom_csp_evidence
from _harvest_cis_benchmarks_modules.common import BENCHMARKS
from _harvest_cis_benchmarks_modules.cis_parser_constants import BASELINE_PATH, CATALOG_PATH, SOURCES_PATH, WINDOWS_REXP_EVIDENCE_PATH
from _harvest_cis_benchmarks_modules.cis_parser_headings import detect_recommendation_starts
from _harvest_cis_benchmarks_modules.cis_parser_pages import clean_page_lines, flatten_pages
from _harvest_cis_benchmarks_modules.cis_parser_recommendations import benchmark_recommendation_entry, is_windows_helper_only_cis_recommendation
from _harvest_cis_benchmarks_modules.cis_parser_sections import parse_sections
from _harvest_cis_benchmarks_modules.mapping_outputs import build_baseline_summary, update_readme
from _harvest_cis_benchmarks_modules.common import write_json

def main() -> None:
    """Generate CIS catalog, baseline summary, source artifacts, and README state."""
    sources = {
        entry["id"]: entry
        for entry in json.loads(SOURCES_PATH.read_text(encoding="utf8"))
    }
    field_index = build_setting_index()
    windows_rexp_evidence = load_windows_custom_csp_evidence(WINDOWS_REXP_EVIDENCE_PATH)
    apple_mobileconfig_evidence = load_apple_mobileconfig_evidence()
    recommendations = [
        recommendation
        for benchmark in BENCHMARKS
        for recommendation in parse_benchmark(
            {
                "benchmark": benchmark,
                "fieldIndex": field_index,
                "windowsRexpEvidence": windows_rexp_evidence,
                "appleMobileconfigEvidence": apple_mobileconfig_evidence,
            }
        )
    ]
    write_json(CATALOG_PATH, recommendations)
    write_json(BASELINE_PATH, build_baseline_summary(sources, recommendations))
    build_source_artifacts("cis")
    update_readme()


def extract_pdf_text(path: Path) -> str:
    """Extract sorted page text from a CIS benchmark PDF using PyMuPDF."""
    if not path.is_file():
        raise FileNotFoundError(f"CIS benchmark PDF not found: {path}")
    try:
        pymupdf = importlib.import_module("pymupdf")
    except ModuleNotFoundError as error:
        raise ModuleNotFoundError(
            "PyMuPDF is required to parse CIS benchmark PDFs"
        ) from error

    with pymupdf.open(path) as document:
        return "\f".join(page.get_text(sort=True) for page in document)


def parse_benchmark(
    context: dict[str, Any],
    *,
    pdf_text_extractor: Callable[[Path], str] = extract_pdf_text,
) -> list[dict[str, Any]]:
    """Parse one benchmark PDF into normalized CIS recommendation records."""
    benchmark = context["benchmark"]
    field_index = context["fieldIndex"]
    windows_rexp_evidence = context["windowsRexpEvidence"]
    apple_mobileconfig_evidence = context["appleMobileconfigEvidence"]
    parsed_text = parsed_benchmark_text(pdf_text_extractor(benchmark.path))
    lines = parsed_text["lines"]
    starts = parsed_text["starts"]
    recommendations: list[dict[str, Any]] = []
    helper_only_skipped = 0
    for index, start in enumerate(starts):
        end_offset = (
            starts[index + 1]["startOffset"] if index + 1 < len(starts) else len(lines)
        )
        block_lines = lines[start["profileOffset"] + 1 : end_offset]
        sections = parse_sections(block_lines)
        if is_windows_helper_only_cis_recommendation(
            benchmark.platform, start["recommendationId"], start["title"]
        ):
            helper_only_skipped += 1
        recommendations.append(
            benchmark_recommendation_entry(
                {
                    "benchmark": benchmark,
                    "start": start,
                    "sections": sections,
                    "fieldIndex": field_index,
                    "windowsRexpEvidence": windows_rexp_evidence,
                    "appleMobileconfigEvidence": apple_mobileconfig_evidence,
                }
            )
        )
    if helper_only_skipped:
        print(
            f"  Skipped {helper_only_skipped} helper-only items (not semantic candidates)",
            file=sys.stderr,
        )
    return recommendations


def parsed_benchmark_text(pdf_text: str) -> dict[str, Any]:
    """Normalize PDF text into clean lines and recommendation start offsets."""
    pages = [clean_page_lines(page) for page in pdf_text.split("\f")]
    lines, page_starts = flatten_pages(pages)
    return {"lines": lines, "starts": detect_recommendation_starts(pages, page_starts)}
