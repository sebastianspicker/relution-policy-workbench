"""Cohesive implementation stage 5 for manual_mapping_promotions."""

from .manual_mapping_promotions_shared import Any
from .manual_mapping_promotions_shared import REPO_ROOT
from .manual_mapping_promotions_shared import flatten_value_paths
from .manual_mapping_promotions_shared import mapping_target
from .manual_mapping_promotions_shared import read_json

def manual_promotion_target_is_valid(
    platform: str, mapping: dict[str, Any], field_index: dict[str, list[Any]]
) -> bool:
    """Check that a manual promotion targets known payloads or setting fields."""

    target = mapping_target(mapping)
    if target is None:
        return False
    if mapping.get("kind") == "apple-mobileconfig":
        evidence_path = (
            REPO_ROOT
            / "example"
            / "vendor-references"
            / "downloads"
            / "derived"
            / "apple-mobileconfig-evidence.json"
        )
        if not evidence_path.exists():
            return False
        payload = read_json(evidence_path)
        payload_types = {
            str(entry.get("payloadType", ""))
            for entry in payload.get("settings", [])
            if isinstance(entry, dict)
        }
        return target in payload_types
    available_paths = {
        str(field.field_path)
        for field in field_index.get(platform, [])
        if field.kind == mapping.get("kind") and field.target == target
    }
    return bool(available_paths) and all(
        path in available_paths
        for path in flatten_value_paths(mapping.get("values", {}))
    )

