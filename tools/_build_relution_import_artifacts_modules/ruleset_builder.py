"""Compatibility facade for Relution ruleset and settings-catalog builders."""

from __future__ import annotations

import hashlib
import itertools
import re
from typing import Any

from recommendation_mapping import flatten_value_paths

from .artifact_io import (
    build_aggregate_rule,
    build_informational_rule,
    flatten_values,
    normalize_policy_platform,
    path_to_string,
    policy_description,
    policy_name,
    relative_path,
    semantic_concept_ids_for_target_spec,
    slugify,
    stable_json,
    unique_preserving_order,
    unique_single_value,
    variant_id_from_signature,
)
from .artifact_paths import (
    ALL_SOURCES,
    MULTI_INSTANCE_TARGET_TYPES,
    PLATFORM_ORDER,
    SourceConfig,
)
from .mapping_helpers import (
    exact_mappings,
    mapping_target,
    mapping_with_target,
)
from .ruleset_bundle_groups import (
    build_bundle_group,
    bundle_suffixes,
    make_bundle,
    variant_group_metadata,
)
from .ruleset_bundle_helpers import (
    find_conflicting_paths,
    inflate_values,
    merged_non_conflicting_paths,
    variant_entries_by_signature,
    variant_signature,
)
from .ruleset_catalog import (
    add_importable_mapping_groups,
    build_setting_catalog,
    importable_native_mappings,
    non_importable_recommendation_entry,
    safe_relution_target_type,
)
from .ruleset_catalog_instances import multi_instance_id
from .ruleset_non_native import (
    build_non_native_aggregate_rule,
    build_non_native_aggregate_rules,
    non_native_aggregate_rules_for_group,
)
from .ruleset_policy_helpers import (
    aggregate_rules_for,
    informational_rules_for,
    ruleset_policy,
    variant_options_for,
)
from .ruleset_reporting import (
    count_by,
    difference_severity_rank,
    semantic_support_level,
    source_coverage_counts,
    source_recommendation_counts,
)
from .ruleset_rules import (
    aggregate_bundles_by_platform,
    informative_entries_by_platform_for,
    ruleset_policies,
    ruleset_policies_for_platform,
)
from .ruleset_rules_core import build_ruleset
from .ruleset_semantic_core import (
    append_unique,
    empty_semantic_concept,
    ensure_semantic_concept,
    ensure_semantic_target,
    semantic_target_id,
)
from .ruleset_semantic_links import (
    add_recommendation_target_link,
    exact_target_specs,
    target_link_concept_ids,
)
from .ruleset_semantic_targets import candidate_target_specs

__all__ = [
    "ALL_SOURCES",
    "Any",
    "MULTI_INSTANCE_TARGET_TYPES",
    "PLATFORM_ORDER",
    "SourceConfig",
    "add_importable_mapping_groups",
    "add_recommendation_target_link",
    "aggregate_bundles_by_platform",
    "aggregate_rules_for",
    "append_unique",
    "build_aggregate_rule",
    "build_bundle_group",
    "build_informational_rule",
    "build_non_native_aggregate_rule",
    "build_non_native_aggregate_rules",
    "build_ruleset",
    "build_setting_catalog",
    "bundle_suffixes",
    "candidate_target_specs",
    "count_by",
    "difference_severity_rank",
    "empty_semantic_concept",
    "ensure_semantic_concept",
    "ensure_semantic_target",
    "exact_mappings",
    "exact_target_specs",
    "find_conflicting_paths",
    "flatten_value_paths",
    "flatten_values",
    "hashlib",
    "importable_native_mappings",
    "informational_rules_for",
    "informative_entries_by_platform_for",
    "inflate_values",
    "itertools",
    "make_bundle",
    "mapping_target",
    "mapping_with_target",
    "merged_non_conflicting_paths",
    "multi_instance_id",
    "non_importable_recommendation_entry",
    "non_native_aggregate_rules_for_group",
    "normalize_policy_platform",
    "path_to_string",
    "policy_description",
    "policy_name",
    "re",
    "relative_path",
    "ruleset_policies",
    "ruleset_policies_for_platform",
    "ruleset_policy",
    "safe_relution_target_type",
    "semantic_concept_ids_for_target_spec",
    "semantic_support_level",
    "semantic_target_id",
    "slugify",
    "source_coverage_counts",
    "source_recommendation_counts",
    "stable_json",
    "target_link_concept_ids",
    "unique_preserving_order",
    "unique_single_value",
    "variant_entries_by_signature",
    "variant_group_metadata",
    "variant_id_from_signature",
    "variant_options_for",
    "variant_signature",
]
