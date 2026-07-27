"""Aggregate native Relution mappings into CIS rules."""
from __future__ import annotations

from typing import Any

from _harvest_cis_benchmarks_modules.common import BenchmarkSpec, slugify

def build_aggregate_rules(
    benchmark: BenchmarkSpec, recommendations: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Build aggregate native Relution rules for non-conflicting exact mappings."""
    groups: dict[str, dict[str, Any]] = {}
    for recommendation in recommendations:
        relution_mapping = recommendation["relutionMapping"]
        if relution_mapping["status"] != "exact":
            continue
        for mapping in relution_mapping["rulesetMappings"]:
            if mapping["kind"] != "relution-native":
                continue
            target = mapping["type"]
            group = groups.setdefault(
                target,
                {
                    "kind": mapping["kind"],
                    "type": mapping["type"],
                    "values": {},
                    "recommendationIds": [],
                    "titles": [],
                },
            )
            conflict = False
            for key, value in mapping["values"].items():
                if key in group["values"] and group["values"][key] != value:
                    conflict = True
                    break
            if conflict:
                continue
            group["values"].update(mapping["values"])
            group["recommendationIds"].append(recommendation["recommendationId"])
            group["titles"].append(recommendation["title"])
    rules: list[dict[str, Any]] = []
    for target, group in groups.items():
        if not group["values"]:
            continue
        rules.append(
            {
                "id": f"{benchmark.benchmark_id}-aggregate-{slugify(target)}",
                "title": f"Relution aggregate: {target}",
                "informational": False,
                "reason": (
                    "Aggregates exact Relution mappings from "
                    f"{', '.join(group['recommendationIds'])}."
                ),
                "sourceIds": [benchmark.benchmark_id],
                "mappings": [
                    {
                        "kind": group["kind"],
                        "type": group["type"],
                        "values": group["values"],
                    }
                ],
            }
        )
    return rules

