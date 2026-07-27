"""Cohesive implementation stage 5 for unified_analysis."""

from .unified_analysis_shared import ALL_SOURCES
from .unified_analysis_shared import AUTHORITATIVE_SOURCE
from .unified_analysis_shared import Any
from .unified_analysis_shared import PLATFORM_ORDER
from .unified_analysis_shared import exact_mappings
from .unified_analysis_shared import flatten_values
from .unified_analysis_shared import mapping_target
from .unified_analysis_shared import normalize_policy_platform
from .unified_analysis_shared import path_to_string
from .unified_analysis_shared import slugify
from .unified_analysis_shared import stable_json

def common_group_sort_key(group: dict[str, Any]) -> tuple[int, int, int, str, str]:
    """Sort common groups by BSI coverage, breadth, platform, and concept."""

    sources = group.get("sources", [])
    return (
        0 if AUTHORITATIVE_SOURCE in sources else 1,
        -len(sources),
        PLATFORM_ORDER.get(str(group.get("platform", "")), 99),
        str(group.get("platform", "")),
        str(group.get("conceptId", "")),
    )

def analyze_exact_mapping_differences(
    recommendations: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Find exact-value conflicts and compatible differences against BSI."""
    from .unified_analysis import exact_leaf_difference_is_hard, exact_value_difference_entry

    leaves_by_key = exact_mapping_leaves_by_key(recommendations)
    contradictions: list[dict[str, Any]] = []
    differences: list[dict[str, Any]] = []
    for (platform, kind, target, field_path), leaves in sorted(leaves_by_key.items()):
        sources = {leaf["source"] for leaf in leaves}
        if AUTHORITATIVE_SOURCE not in sources or not sources.intersection(
            set(ALL_SOURCES) - {AUTHORITATIVE_SOURCE}
        ):
            continue
        value_signatures = {leaf["valueSignature"] for leaf in leaves}
        if len(value_signatures) <= 1:
            continue
        entry = exact_value_difference_entry(platform, kind, target, field_path, leaves)
        if exact_leaf_difference_is_hard(leaves):
            entry["id"] = slugify(f"hard-{platform}-{kind}-{target}-{field_path}")
            entry["type"] = "hard-exact-value-contradiction"
            entry["severity"] = "error"
            contradictions.append(entry)
        else:
            entry["id"] = slugify(f"difference-{platform}-{kind}-{target}-{field_path}")
            entry["type"] = "constraint-compatible-exact-value-difference"
            entry["severity"] = "info"
            differences.append(entry)
    return contradictions, differences

def exact_mapping_leaves_by_key(
    recommendations: dict[str, dict[str, Any]],
) -> dict[tuple[str, str, str, str], list[dict[str, Any]]]:
    """Index exact mapping leaf values by platform, target, and field path."""

    leaves_by_key: dict[tuple[str, str, str, str], list[dict[str, Any]]] = {}
    for recommendation in recommendations.values():
        source = str(recommendation["_source"])
        platform = normalize_policy_platform(str(recommendation.get("platform", "")))
        for mapping in exact_mappings(recommendation):
            target = mapping_target(mapping)
            if target is None:
                continue
            flattened = flatten_values(mapping.get("values", {}))
            constraints = constraints_by_path(mapping)
            for path, value in flattened.items():
                path_string = path_to_string(path)
                leaves_by_key.setdefault(
                    (platform, str(mapping["kind"]), target, path_string), []
                ).append(
                    {
                        "source": source,
                        "globalId": recommendation["_globalId"],
                        "recommendationId": recommendation["id"],
                        "title": recommendation["title"],
                        "value": value,
                        "valueSignature": stable_json(value),
                        "constraints": constraints.get(path_string, []),
                    }
                )
    return leaves_by_key

def constraints_by_path(mapping: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Group exact-mapping constraints by their declared value path."""

    grouped: dict[str, list[dict[str, Any]]] = {}
    for constraint in mapping.get("constraints", []):
        if not isinstance(constraint, dict) or not isinstance(
            constraint.get("path"), str
        ):
            continue
        grouped.setdefault(str(constraint["path"]), []).append(dict(constraint))
    return grouped

