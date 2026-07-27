#!/usr/bin/env python3
"""Compare institution policy exports against generated baseline recommendations."""

from __future__ import annotations

import argparse
from pathlib import Path

from _build_relution_import_artifacts_modules.artifact_io import flatten_values
from _compare_institution_policy_baseline_baseline import (
    harvest_relution_baseline_index,
    is_actionable,
    mapping_target,
)
from _compare_institution_policy_baseline_comparison import (
    compare_indexes,
    comparison_status,
)
from _compare_institution_policy_baseline_constants import (
    BACKTICK_POLICY_RE,
    BASELINE_TEMPLATE_INDEX_PATH,
    CSP_GENERIC_TERMS,
    DEFAULT_INSTITUTION_ROOT,
    DEFAULT_OUTPUT_ROOT,
    INSTITUTION_POLICY_FILES,
    PLATFORM_SLUGS,
    PLATFORMS,
    POLICY_NAME_RE,
    REPO_ROOT,
    TARGET_KEYWORDS,
)
from _compare_institution_policy_baseline_harvest import (
    extract_policy_names,
    harvest_institution_policy_index,
    harvest_policy_file,
)
from _compare_institution_policy_baseline_identifiers import (
    identifier_like_tokens,
    is_policy_id,
)
from _compare_institution_policy_baseline_matching import (
    baseline_target_matches_policy,
    conflict_for,
)
from _compare_institution_policy_baseline_reporting import render_markdown, write_outputs
from _compare_institution_policy_baseline_settings import (
    find_control_ids,
    infer_setting_values,
    is_control_id,
)
from _compare_institution_policy_baseline_summary import (
    comparison_summary_by_platform,
    summarize_by_platform,
)
from _compare_institution_policy_baseline_text import (
    extract_signal_text,
    find_policy_id,
    infer_targets,
    markdown_headings,
)
from _compare_institution_policy_baseline_targeting import target_platform
from _compare_institution_policy_baseline_utils import (
    first_int,
    identifier_tokens,
    line_start_offsets,
    normalize_text,
    offset_to_line,
    one_line,
    path_to_string,
    platform_rank,
    read_json,
    stable_json,
    write_json,
)


__all__ = [
    "BACKTICK_POLICY_RE",
    "BASELINE_TEMPLATE_INDEX_PATH",
    "CSP_GENERIC_TERMS",
    "DEFAULT_INSTITUTION_ROOT",
    "DEFAULT_OUTPUT_ROOT",
    "INSTITUTION_POLICY_FILES",
    "PLATFORM_SLUGS",
    "PLATFORMS",
    "POLICY_NAME_RE",
    "REPO_ROOT",
    "TARGET_KEYWORDS",
    "baseline_target_matches_policy",
    "compare_indexes",
    "comparison_status",
    "comparison_summary_by_platform",
    "conflict_for",
    "extract_policy_names",
    "extract_signal_text",
    "find_control_ids",
    "find_policy_id",
    "first_int",
    "flatten_values",
    "harvest_institution_policy_index",
    "harvest_policy_file",
    "harvest_relution_baseline_index",
    "identifier_like_tokens",
    "identifier_tokens",
    "infer_setting_values",
    "infer_targets",
    "is_actionable",
    "is_control_id",
    "is_policy_id",
    "line_start_offsets",
    "main",
    "mapping_target",
    "markdown_headings",
    "normalize_text",
    "offset_to_line",
    "one_line",
    "path_to_string",
    "platform_rank",
    "read_json",
    "render_markdown",
    "stable_json",
    "summarize_by_platform",
    "target_platform",
    "write_json",
    "write_outputs",
]


def main() -> None:
    """Run the policy-vs-baseline comparison CLI."""

    parser = argparse.ArgumentParser(
        description=(
            "Compare Institution managed-device policy docs with generated Relution "
            "baselines."
        )
    )
    parser.add_argument(
        "--institution-root", type=Path, default=DEFAULT_INSTITUTION_ROOT
    )
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    args = parser.parse_args()

    institution_index = harvest_institution_policy_index(args.institution_root)
    baseline_index = harvest_relution_baseline_index(BASELINE_TEMPLATE_INDEX_PATH)
    comparison = compare_indexes(institution_index, baseline_index)
    write_outputs(args.output_root, institution_index, baseline_index, comparison)


if __name__ == "__main__":
    main()
