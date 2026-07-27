"""Compatibility exports for Relution baseline-template builders."""

from datetime import datetime, timezone
from pathlib import Path
from collections.abc import Callable
from typing import Any

from .artifact_io import path_to_string, relative_path, slugify, stable_json
from .artifact_paths import REPO_ROOT, SOURCE_CONFIGS, SourceConfig
from .baseline_template_builders import (
    baseline_template_metadata,
    consolidated_platform_template,
    consolidation_metadata,
    modular_bundle,
    modular_bundle_template,
    modular_target_templates,
    module_consolidation,
    module_target_templates,
    module_template,
    source_platform_template,
)
from .baseline_template_constants import (
    BASELINE_TEMPLATE_CONSOLIDATED_ROOT,
    BASELINE_TEMPLATE_INDEX_PATH,
    BASELINE_TEMPLATE_MODULAR_ROOT,
    BASELINE_TEMPLATE_PLATFORMS,
    BASELINE_TEMPLATE_ROOT,
    BASELINE_TEMPLATE_SOURCE_ROOT,
    BASELINE_TEMPLATE_TIERED_ROOT,
    BASELINE_TIERS,
    GroupedEntries,
    IOS_IMPORT_CONFLICT_PREFERENCES,
    MACOS_IMPORT_CONFLICT_PREFERENCES,
    MULTI_INSTANCE_CONSOLIDATED_TARGETS,
    NON_IMPORTABLE_CONSOLIDATED_TARGETS,
    SOURCE_PRECEDENCE,
    SuppressionResult,
)
from .baseline_template_consolidation import (
    apply_actionable_suppression,
    consolidate_actionable_entries,
    consolidated_actionable_group,
)
from .baseline_template_index import index_entry
from .baseline_template_labels import platform_label, platform_slug, target_label
from .baseline_template_modules import (
    first_rule_mapping,
    grouped_actionable_rules,
    module_metadata,
    module_policy,
    tier_label,
)
from .baseline_template_sources import (
    actionable_entries_for_rule,
    source_actionable_entries,
    source_platform_rules,
)
from .baseline_template_support import (
    actionable_entry_sort_key,
    generated_timestamp,
    informational_counts_by_source,
    is_actionable_rule,
    source_informational_rule,
    source_references,
    verified_as_of_by_source,
)
from .baseline_template_suppressions import (
    suppress_import_conflicting_entries,
    suppress_non_importable_entries,
    suppressed_conflict_rule,
    suppressed_import_conflict_rule,
    suppressed_non_importable_rule,
    suppression_result,
)
from .baseline_template_rules import consolidated_rule_from_entries
from .mapping_helpers import mapping_target, mapping_with_target
from .ruleset_builder import flatten_values, inflate_values
from recommendation_mapping import unique_preserving_order

__all__ = [
    "datetime",
    "timezone",
    "Path",
    "Callable",
    "Any",
    "relative_path",
    "REPO_ROOT",
    "SOURCE_CONFIGS",
    "SourceConfig",
    "path_to_string",
    "slugify",
    "stable_json",
    "mapping_target",
    "unique_preserving_order",
    "mapping_with_target",
    "flatten_values",
    "inflate_values",
    "BASELINE_TEMPLATE_ROOT",
    "BASELINE_TEMPLATE_SOURCE_ROOT",
    "BASELINE_TEMPLATE_CONSOLIDATED_ROOT",
    "BASELINE_TEMPLATE_MODULAR_ROOT",
    "BASELINE_TEMPLATE_TIERED_ROOT",
    "BASELINE_TEMPLATE_INDEX_PATH",
    "BASELINE_TEMPLATE_PLATFORMS",
    "SOURCE_PRECEDENCE",
    "BASELINE_TIERS",
    "MULTI_INSTANCE_CONSOLIDATED_TARGETS",
    "MACOS_IMPORT_CONFLICT_PREFERENCES",
    "IOS_IMPORT_CONFLICT_PREFERENCES",
    "NON_IMPORTABLE_CONSOLIDATED_TARGETS",
    "GroupedEntries",
    "SuppressionResult",
    "source_platform_template",
    "consolidated_platform_template",
    "modular_bundle_template",
    "modular_target_templates",
    "consolidation_metadata",
    "modular_bundle",
    "module_target_templates",
    "baseline_template_metadata",
    "module_template",
    "module_consolidation",
    "grouped_actionable_rules",
    "module_policy",
    "source_platform_rules",
    "module_metadata",
    "first_rule_mapping",
    "consolidate_actionable_entries",
    "apply_actionable_suppression",
    "consolidated_actionable_group",
    "actionable_entries_for_rule",
    "suppress_import_conflicting_entries",
    "suppress_non_importable_entries",
    "suppression_result",
    "consolidated_rule_from_entries",
    "suppressed_import_conflict_rule",
    "suppressed_non_importable_rule",
    "suppressed_conflict_rule",
    "source_informational_rule",
    "is_actionable_rule",
    "actionable_entry_sort_key",
    "informational_counts_by_source",
    "verified_as_of_by_source",
    "source_references",
    "index_entry",
    "platform_label",
    "platform_slug",
    "target_label",
    "generated_timestamp",
    "tier_label",
    "source_actionable_entries",
]
