"""Importable aggregate-rule construction for baseline templates."""

from typing import Any

from .artifact_io import slugify
from .mapping_helpers import mapping_with_target
from .ruleset_builder import flatten_values, inflate_values
from recommendation_mapping import unique_preserving_order


def consolidated_rule_from_entries(
    platform: str,
    key: tuple[str, str],
    entries: list[dict[str, Any]],
    forced_source: str | None,
    forced_rule_id: str | None,
) -> dict[str, Any]:
    """Build the importable aggregate rule for accepted same-target entries."""
    mapping_kind, target = key
    flattened: dict[tuple[str, ...], Any] = {}
    for entry in entries:
        flattened.update(flatten_values(entry["mapping"].get("values", {})))
    mapping = mapping_with_target(mapping_kind, target, inflate_values(flattened))
    if mapping is None:
        raise ValueError(f"Unsupported mapping kind: {mapping_kind}")
    source_part = forced_source or "merged"
    rule_part = forced_rule_id or target
    return {
        "id": slugify(
            f"consolidated-{platform}-{mapping_kind}-{source_part}-{rule_part}"
        ),
        "title": f"Consolidated Relution aggregate: {target}",
        "informational": False,
        "reason": (
            "Consolidates exact mappings from "
            f"{', '.join(unique_preserving_order(entry['source'] for entry in entries))}."
        ),
        "sourceIds": unique_preserving_order(
            source_id
            for entry in entries
            for source_id in entry["rule"].get("sourceIds", [])
        ),
        "sourceRules": [
            {
                "source": entry["source"],
                "ruleId": entry["rule"]["id"],
                "title": entry["rule"].get("title", ""),
            }
            for entry in entries
        ],
        "mappings": [mapping],
    }
