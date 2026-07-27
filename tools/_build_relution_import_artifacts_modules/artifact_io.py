"""Stable public facade for Relution artifact I/O helpers."""

from _tooling_text_io import slugify
from typing import Any

from .artifact_io_json import read_json, write_json
from .artifact_io_paths import relative_path, resolve_relative
from .artifact_io_plans import update_plan_inputs, update_plan_payload
from .artifact_io_rule_text import (
    SOURCE_CONFIG,
    informational_reason,
    informational_title,
    informational_value,
    policy_description,
    policy_name,
)
from .artifact_io_rules import build_aggregate_rule, build_informational_rule
from .artifact_io_semantics import (
    semantic_concept_ids_for_target_spec,
    semantic_target_spec_text,
)
from .artifact_io_settings import (
    ruleset_readme_anchor,
    setting_bundle_paths,
    settings_catalog_readme_line,
    settings_directory_readme_line,
    update_baseline_summary,
    update_readme,
    write_settings_files,
)
from .artifact_io_values import (
    flatten_values,
    normalize_policy_platform,
    path_to_string,
    split_camel_text,
    stable_json,
    stringify_value,
    unique_single_value,
    variant_id_from_signature,
)
from recommendation_mapping import unique_preserving_order as _unique_preserving_order


def unique_preserving_order(values: Any) -> list[Any]:
    """Preserve the legacy artifact-I/O import surface for ordered uniqueness."""

    return _unique_preserving_order(values)

__all__ = [
    "SOURCE_CONFIG",
    "build_aggregate_rule",
    "build_informational_rule",
    "flatten_values",
    "informational_reason",
    "informational_title",
    "informational_value",
    "normalize_policy_platform",
    "path_to_string",
    "policy_description",
    "policy_name",
    "read_json",
    "relative_path",
    "resolve_relative",
    "ruleset_readme_anchor",
    "semantic_concept_ids_for_target_spec",
    "semantic_target_spec_text",
    "setting_bundle_paths",
    "settings_catalog_readme_line",
    "settings_directory_readme_line",
    "slugify",
    "split_camel_text",
    "stable_json",
    "stringify_value",
    "unique_single_value",
    "unique_preserving_order",
    "update_baseline_summary",
    "update_plan_inputs",
    "update_plan_payload",
    "update_readme",
    "variant_id_from_signature",
    "write_json",
    "write_settings_files",
]
