"""Validate manually reviewed mapping promotions for recommendation imports."""

from .manual_mapping_promotions_shared import ALL_SOURCES as ALL_SOURCES
from .manual_mapping_promotions_shared import Any as Any
from .manual_mapping_promotions_shared import MANUAL_MAPPING_PROMOTIONS_PATH as MANUAL_MAPPING_PROMOTIONS_PATH
from .manual_mapping_promotions_shared import Path as Path
from .manual_mapping_promotions_shared import REPO_ROOT as REPO_ROOT
from .manual_mapping_promotions_shared import build_setting_index as build_setting_index
from .manual_mapping_promotions_shared import flatten_value_paths as flatten_value_paths
from .manual_mapping_promotions_shared import load_recommendations_by_global_id as load_recommendations_by_global_id
from .manual_mapping_promotions_shared import mapping_target as mapping_target
from .manual_mapping_promotions_shared import mapping_with_target as mapping_with_target
from .manual_mapping_promotions_shared import normalize_policy_platform as normalize_policy_platform
from .manual_mapping_promotions_shared import read_json as read_json
from .manual_mapping_promotions_shared import relative_path as relative_path
from .manual_mapping_promotions_shared import write_json as write_json

from .manual_mapping_promotions_group_01 import manual_promotions_by_recommendation as manual_promotions_by_recommendation
from .manual_mapping_promotions_group_01 import load_manual_mapping_promotion_entries as load_manual_mapping_promotion_entries
from .manual_mapping_promotions_group_01 import ensure_manual_mapping_promotions_file as ensure_manual_mapping_promotions_file
from .manual_mapping_promotions_group_02 import validate_manual_mapping_promotions as validate_manual_mapping_promotions
from .manual_mapping_promotions_group_03 import validate_manual_mapping_promotion_entry as validate_manual_mapping_promotion_entry
from .manual_mapping_promotions_group_03 import validated_manual_mapping_platform as validated_manual_mapping_platform
from .manual_mapping_promotions_group_03 import manual_mapping_promotions_path_label as manual_mapping_promotions_path_label
from .manual_mapping_promotions_group_04 import manual_promotion_ruleset_mapping as manual_promotion_ruleset_mapping
from .manual_mapping_promotions_group_05 import manual_promotion_target_is_valid as manual_promotion_target_is_valid

__all__ = [
    "ALL_SOURCES", "Any", "MANUAL_MAPPING_PROMOTIONS_PATH", "Path", "REPO_ROOT",
    "build_setting_index", "flatten_value_paths", "load_recommendations_by_global_id",
    "mapping_target", "mapping_with_target", "normalize_policy_platform", "read_json",
    "relative_path", "write_json", "manual_promotions_by_recommendation",
    "load_manual_mapping_promotion_entries", "ensure_manual_mapping_promotions_file",
    "validate_manual_mapping_promotions", "validate_manual_mapping_promotion_entry",
    "validated_manual_mapping_platform", "manual_mapping_promotions_path_label",
    "manual_promotion_ruleset_mapping", "manual_promotion_target_is_valid",
]
