"""CIS importable ruleset construction."""
from __future__ import annotations

from typing import Any

from _harvest_cis_benchmarks_modules.common import BENCHMARKS
from _harvest_cis_benchmarks_modules.cis_mapping_aggregate import build_aggregate_rules

def build_ruleset(recommendations: list[dict[str, Any]]) -> dict[str, Any]:
    """Build the CIS benchmark ruleset from harvested recommendations."""
    policies: list[dict[str, Any]] = []
    by_benchmark: dict[str, list[dict[str, Any]]] = {}
    for recommendation in recommendations:
        by_benchmark.setdefault(recommendation["benchmarkId"], []).append(
            recommendation
        )

    for benchmark in BENCHMARKS:
        entries = by_benchmark[benchmark.benchmark_id]
        aggregate_rules = build_aggregate_rules(benchmark, entries)
        informational_rules = [
            {
                "id": entry["id"],
                "title": f"{entry['recommendationId']} {entry['title']}",
                "informational": True,
                "reason": entry["rationale"] or entry["description"],
                "recommendedValue": entry["recommendedValue"],
                "assessmentStatus": entry["assessmentStatus"],
                "mappingStatus": entry["relutionMapping"]["status"],
                "sourceIds": entry["sourceIds"],
                "mappings": [],
            }
            for entry in entries
        ]
        policies.append(
            {
                "platform": benchmark.platform,
                "name": benchmark.benchmark_title,
                "description": (
                    f"{benchmark.benchmark_title} v{benchmark.version} harvested "
                    "from the saved PDF corpus."
                ),
                "benchmarkId": benchmark.benchmark_id,
                "sourcePdfPath": benchmark.source_pdf_path,
                "rules": informational_rules + aggregate_rules,
            }
        )

    return {
        "version": 1,
        "name": "CIS Benchmark OS Baselines",
        "verifiedAsOf": "2026-04-24",
        "sourceIndexPath": "example/cis-references/sources.json",
        "recommendationCatalogPath": "example/cis-references/cis-recommendations.json",
        "policies": policies,
    }

