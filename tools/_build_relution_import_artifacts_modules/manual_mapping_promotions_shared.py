"""Validate manually reviewed mapping promotions for recommendation imports."""

from pathlib import Path
from typing import Any

from recommendation_mapping import build_setting_index, flatten_value_paths

from .artifact_paths import (
    ALL_SOURCES,
    MANUAL_MAPPING_PROMOTIONS_PATH,
    REPO_ROOT,
)
from .artifact_io import (
    normalize_policy_platform,
    read_json,
    write_json,
)
from .mapping_helpers import (
    mapping_target,
)
from .artifact_io import relative_path
from .mapping_helpers import mapping_with_target
from .recommendation_catalog import load_recommendations_by_global_id

__all__ = [
    "Path", "Any", "build_setting_index", "flatten_value_paths", "ALL_SOURCES",
    "MANUAL_MAPPING_PROMOTIONS_PATH", "REPO_ROOT", "normalize_policy_platform", "read_json",
    "write_json", "mapping_target", "relative_path", "mapping_with_target",
    "load_recommendations_by_global_id",
]

