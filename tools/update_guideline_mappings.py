#!/usr/bin/env python3
"""Refresh guideline-derived mapping artifacts.

Use `--offline` for the normal reproducible path from checked-in source
material. Online refresh intentionally fails closed for BSI/CIS until their
downloaders are explicit and reviewable; vendor guidance is the only refreshable
source in this wrapper.
"""

from _guideline_mapping_update_modules.cli import main
from _build_relution_import_artifacts_modules.relution_mapping_updates import (
    apply_safe_relution_mapping_updates,
)
from _guideline_mapping_update_modules.contracts import (
    BUILD_COMMAND_ARGS,
    EXPECTED_UPDATE_ARTIFACT_PATHS,
    OFFLINE_SOURCE_COMMANDS,
    REPO_ROOT,
    SUPPORTED_SOURCES,
    assert_expected_outputs_written,
)
from _guideline_mapping_update_modules.workflow import (
    rebuild_sources_offline,
    refresh_sources,
    run_build_relution_import_artifacts,
    run_repo_python_tool,
)

__all__ = [
    "BUILD_COMMAND_ARGS",
    "EXPECTED_UPDATE_ARTIFACT_PATHS",
    "OFFLINE_SOURCE_COMMANDS",
    "REPO_ROOT",
    "SUPPORTED_SOURCES",
    "apply_safe_relution_mapping_updates",
    "assert_expected_outputs_written",
    "main",
    "rebuild_sources_offline",
    "refresh_sources",
    "run_build_relution_import_artifacts",
    "run_repo_python_tool",
]


if __name__ == "__main__":
    main()
