"""Tests for recommendation-mapping artifact catalog validation."""

from pathlib import Path

from python_tool_helpers import expect, import_tool


artifact_module = import_tool("build_relution_import_artifacts")

SourceConfig = artifact_module.SourceConfig
build_coverage_matrix = artifact_module.build_coverage_matrix
build_semantic_index = artifact_module.build_semantic_index


def source_config(
    source: str, root: Path, recommendation_catalog_path: Path
) -> SourceConfig:
    """Build a temporary source config for generated-artifact tests."""
    return SourceConfig(
        source=source,
        label=source.upper(),
        root=root,
        recommendation_catalog_path=recommendation_catalog_path,
        ruleset_path=root / f"{source}-ruleset.json",
        settings_catalog_path=root / f"{source}-settings.json",
        baseline_path=root / f"{source}-baseline.json",
        readme_path=root / "README.md",
    )


def test_coverage_matrix_fails_when_required_catalog_is_missing(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Fail coverage generation with present/missing catalog counts."""
    present = tmp_path / "bsi-recommendations.json"
    missing = tmp_path / "cis-recommendations.json"
    present.write_text("[]", encoding="utf8")
    monkeypatch.setitem(
        build_coverage_matrix.__globals__,
        "SOURCE_CONFIGS",
        {
            "bsi": source_config("bsi", tmp_path, present),
            "cis": source_config("cis", tmp_path, missing),
        },
    )

    try:
        build_coverage_matrix()
    except FileNotFoundError as error:
        message = str(error)
        expect("Required recommendation catalogs missing" in message)
        expect("present=1" in message)
        expect("missing=1" in message)
        expect("cis:" in message)
    else:
        raise AssertionError(
            "missing recommendation catalog did not fail coverage generation"
        )


def test_semantic_index_fails_when_required_catalog_is_missing(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Fail semantic-index generation with actionable missing-catalog detail."""
    present = tmp_path / "bsi-recommendations.json"
    missing = tmp_path / "vendor-recommendations.json"
    present.write_text("[]", encoding="utf8")
    monkeypatch.setitem(
        build_semantic_index.__globals__,
        "SOURCE_CONFIGS",
        {
            "bsi": source_config("bsi", tmp_path, present),
            "vendor": source_config("vendor", tmp_path, missing),
        },
    )
    monkeypatch.setitem(
        build_semantic_index.__globals__, "build_setting_index", lambda: {}
    )

    try:
        build_semantic_index()
    except FileNotFoundError as error:
        message = str(error)
        expect("Required recommendation catalogs missing" in message)
        expect("present=1" in message)
        expect("missing=1" in message)
        expect("vendor:" in message)
    else:
        raise AssertionError(
            "missing recommendation catalog did not fail semantic index generation"
        )
