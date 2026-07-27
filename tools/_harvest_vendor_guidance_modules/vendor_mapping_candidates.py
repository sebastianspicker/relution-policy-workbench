"""Candidate selection helpers for vendor recommendation mappings."""

from __future__ import annotations

from typing import Any

from _harvest_vendor_guidance_modules.vendor_mapping_text import tokenize


def mapping_candidates(
    platform: str,
    title: str,
    section: str,
    field_index: dict[str, list[dict[str, Any]]],
    exact_mapping: Any,
) -> list[dict[str, Any]]:
    """Return scored field candidates plus exact mapping fields when present."""

    query_tokens = tokenize(f"{section} {title}")
    scored = []
    for field in field_index.get(platform, []):
        score = len(query_tokens & field["tokens"])
        if score > 0:
            scored.append((score, field["target"], field["fieldPaths"][0], field))
    scored.sort(key=lambda entry: (-entry[0], entry[1], entry[2]))
    candidates = [
        {
            "kind": "relution-native",
            "target": field["target"],
            "fieldPaths": field["fieldPaths"],
        }
        for _, _, _, field in scored[:5]
    ]
    if isinstance(exact_mapping, tuple):
        target, values = exact_mapping
        for path in flatten_value_paths(values):
            exact_candidate = {
                "kind": "relution-native",
                "target": target,
                "fieldPaths": [path],
            }
            candidates = [
                exact_candidate,
                *[
                    candidate
                    for candidate in candidates
                    if candidate != exact_candidate
                ],
            ]
    return candidates[:5]


def flatten_value_paths(value: Any, prefix: tuple[str, ...] = ()) -> list[str]:
    """Return dotted paths for each leaf in a mapping value tree."""

    if isinstance(value, dict):
        paths = []
        for key in sorted(value):
            paths.extend(flatten_value_paths(value[key], (*prefix, str(key))))
        return paths
    return [".".join(prefix)]
