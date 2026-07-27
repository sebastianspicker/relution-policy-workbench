"""Build the vendor harvester's Relution field index."""

from __future__ import annotations

from typing import Any

from _harvest_vendor_guidance_modules.common import TEMPLATE_BUNDLE_PATH
from _harvest_vendor_guidance_modules.vendor_mapping_text import read_json, tokenize


def build_field_index() -> dict[str, list[dict[str, Any]]]:
    """Build a simple searchable Relution field index from template metadata."""

    bundle = read_json(TEMPLATE_BUNDLE_PATH)
    indexed: dict[str, list[dict[str, Any]]] = {
        "ANDROID": [],
        "MACOS": [],
        "WINDOWS": [],
    }
    for config in bundle["configurationTypes"]:
        target_type = str(config["type"])
        platforms = set(config.get("platforms", []))
        logical_platforms = []
        if "ANDROID_ENTERPRISE" in platforms or target_type.startswith(
            "ANDROID_ENTERPRISE"
        ):
            logical_platforms.append("ANDROID")
        if "MACOS" in platforms or target_type.startswith(("MACOS", "APPLE_")):
            logical_platforms.append("MACOS")
        if "WINDOWS" in platforms or target_type.startswith("WINDOWS"):
            logical_platforms.append("WINDOWS")
        for field in config.get("fields", []):
            path = str(field.get("path", ""))
            if path in {"uuid", "type"} or not path:
                continue
            label = str(field.get("label", path))
            entry = {
                "kind": "relution-native",
                "target": target_type,
                "fieldPaths": [path],
                "tokens": tokenize(f"{target_type} {path} {label}"),
            }
            for platform in logical_platforms:
                indexed[platform].append(entry)
    return indexed
