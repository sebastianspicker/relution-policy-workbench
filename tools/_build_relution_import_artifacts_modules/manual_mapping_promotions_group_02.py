"""Cohesive implementation stage 2 for manual_mapping_promotions."""

from .manual_mapping_promotions_shared import Any
from .manual_mapping_promotions_shared import MANUAL_MAPPING_PROMOTIONS_PATH
from .manual_mapping_promotions_shared import Path
from .manual_mapping_promotions_shared import build_setting_index
from .manual_mapping_promotions_shared import load_recommendations_by_global_id
from .manual_mapping_promotions_shared import read_json

def validate_manual_mapping_promotions(
    exact_references: list[dict[str, Any]], path: Path = MANUAL_MAPPING_PROMOTIONS_PATH
) -> list[dict[str, Any]]:
    """Validate that manual promotions reference known recommendations and fields."""
    from .manual_mapping_promotions import manual_mapping_promotions_path_label, validate_manual_mapping_promotion_entry

    payload = read_json(path)
    path_label = manual_mapping_promotions_path_label(path)
    if not isinstance(payload, dict):
        raise ValueError(f"{path_label} must contain a JSON object")
    if payload.get("version") != 1:
        raise ValueError(f"{path_label} version must be 1")
    entries = payload.get("entries", [])
    if not isinstance(entries, list):
        raise ValueError(f"{path_label} entries must be an array")

    references = {str(row["mappingId"]) for row in exact_references}
    recommendations = load_recommendations_by_global_id()
    field_index = build_setting_index()
    errors: list[str] = []
    valid_entries: list[dict[str, Any]] = []
    for index, entry in enumerate(entries):
        if isinstance(entry, dict):
            errors.extend(
                validate_manual_mapping_promotion_entry(
                    index, entry, references, recommendations, field_index
                )
            )
            valid_entries.append(entry)
        else:
            errors.append(f"entry {index}: must be an object")
    if errors:
        raise ValueError(
            "Invalid manual mapping promotion ledger:\n" + "\n".join(errors)
        )
    return valid_entries

