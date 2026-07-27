"""Tests for recommendation mapping artifact management."""

from pathlib import Path

from python_tool_helpers import expect, import_tool


artifact_module = import_tool("build_relution_import_artifacts")
update_guideline_module = import_tool("update_guideline_mappings")
artifact_pipeline_module = import_tool(
    "_build_relution_import_artifacts_modules.artifact_pipeline"
)
candidate_inference_module = import_tool(
    "_recommendation_mapping_modules.candidate_inference"
)

SourceConfig = artifact_module.SourceConfig
build_source_change_rows = artifact_module.build_source_change_rows
build_unified_recommendation_analysis = (
    artifact_module.build_unified_recommendation_analysis
)
ensure_manual_mapping_promotions_file = (
    artifact_module.ensure_manual_mapping_promotions_file
)
importable_native_mappings = artifact_module.importable_native_mappings
source_text_hash = artifact_module.source_text_hash
validate_manual_mapping_promotions = artifact_module.validate_manual_mapping_promotions
write_settings_files = artifact_module.write_settings_files
assert_expected_outputs_written = (
    update_guideline_module.assert_expected_outputs_written
)


def test_exact_relution_mappings_reject_path_like_target_types() -> None:
    """Drop exact native mappings whose target type is path-like."""
    recommendation = {
        "relutionMapping": {
            "status": "exact",
            "rulesetMappings": [
                {
                    "kind": "relution-native",
                    "type": "../../escape",
                    "values": {"enabled": True},
                },
                {
                    "kind": "relution-native",
                    "type": "IOS_PASSCODE",
                    "values": {"enabled": True},
                },
            ],
        },
    }

    expect(
        importable_native_mappings(recommendation)
        == [
            {
                "kind": "relution-native",
                "type": "IOS_PASSCODE",
                "values": {"enabled": True},
            },
        ]
    )


def test_setting_bundle_writer_rejects_paths_outside_settings_root(
    tmp_path: Path,
) -> None:
    """Reject escaping paths without destroying the existing settings bundle tree."""
    config = SourceConfig(
        source="vendor",
        label="Vendor",
        root=tmp_path,
        recommendation_catalog_path=tmp_path / "recommendations.json",
        ruleset_path=tmp_path / "ruleset.json",
        settings_catalog_path=tmp_path / "settings.json",
        baseline_path=tmp_path / "baseline.json",
        readme_path=tmp_path / "README.md",
    )

    existing_bundle = tmp_path / "relution-settings" / "IOS" / "existing.json"
    existing_bundle.parent.mkdir(parents=True)
    existing_bundle.write_text('{"existing": true}\n', encoding="utf8")

    try:
        write_settings_files(
            config,
            {
                "bundles": [
                    {
                        "importFilePath": "../escape.json",
                        "details": {"type": "IOS_PASSCODE"},
                    }
                ]
            },
        )
    except ValueError as error:
        expect("escapes expected root" in str(error))
    else:
        raise AssertionError("escaping setting bundle path was accepted")

    expect(existing_bundle.read_text(encoding="utf8") == '{"existing": true}\n')


def test_recommendation_target_links_registers_exact_target_without_module_name_error() -> None:
    """Link an exact target through the pipeline's imported builder function."""
    targets: dict[str, dict[str, object]] = {}
    concepts: dict[str, dict[str, object]] = {}

    target_ids, concept_ids = artifact_pipeline_module.recommendation_target_links(
        {
            "targets": targets,
            "concepts": concepts,
            "platform": "IOS",
            "globalId": "bsi:ios-passcode",
            "rawSemanticIds": [],
        },
        [
            {
                "kind": "relution-native",
                "target": "IOS_PASSCODE",
                "fieldPaths": ["enabled"],
            }
        ],
        "exact",
    )

    expect(len(target_ids) == 1)
    expect(concept_ids)
    expect(all(concept_id in concepts for concept_id in concept_ids))
    expect(targets[target_ids[0]]["exactRecommendationIds"] == ["bsi:ios-passcode"])


def test_android_analog_mapping_rejects_other_platforms_before_text_coercion() -> None:
    """Avoid coercing unneeded recommendation values for unsupported platforms."""

    class UnstringableValue:
        def __str__(self) -> str:
            raise AssertionError("unsupported platform coerced recommended value")

    expect(
        candidate_inference_module.android_relution_analog_mappings_for(
            "WINDOWS", "Ignored", UnstringableValue()
        )
        == []
    )


def test_unified_analysis_warns_when_semantic_index_is_missing(
    tmp_path: Path, monkeypatch: object, capsys: object
) -> None:
    """Warn instead of fabricating unified analysis when the semantic index is absent."""
    monkeypatch.setitem(
        build_unified_recommendation_analysis.__globals__,
        "SEMANTIC_INDEX_PATH",
        tmp_path / "missing-index.json",
    )

    build_unified_recommendation_analysis()

    expect("WARNING: skipping unified analysis" in capsys.readouterr().err)


def test_source_change_rows_fail_when_required_manifest_is_missing(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Fail source-change generation when declared source manifests are absent."""
    present = tmp_path / "bsi-manifest.json"
    missing = tmp_path / "cis-manifest.json"
    present.write_text("[]", encoding="utf8")
    monkeypatch.setitem(
        build_source_change_rows.__globals__,
        "source_manifest_paths",
        lambda: {"bsi": present, "cis": missing},
    )
    monkeypatch.setitem(
        build_source_change_rows.__globals__, "previous_source_change_rows", lambda: []
    )

    try:
        build_source_change_rows({})
    except FileNotFoundError as error:
        message = str(error)
        expect("Required source manifests missing" in message)
        expect("present=1" in message)
        expect("missing=1" in message)
        expect("cis:" in message)
    else:
        raise AssertionError(
            "missing source manifest did not fail source-change generation"
        )


def test_source_change_rows_fail_when_required_manifest_is_malformed(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Fail source-change generation when a manifest is not a list."""
    malformed = tmp_path / "manifest.json"
    malformed.write_text("{}", encoding="utf8")
    monkeypatch.setitem(
        build_source_change_rows.__globals__,
        "source_manifest_paths",
        lambda: {"bsi": malformed},
    )
    monkeypatch.setitem(
        build_source_change_rows.__globals__, "previous_source_change_rows", lambda: []
    )

    try:
        build_source_change_rows({})
    except ValueError as error:
        expect("Required source manifest malformed" in str(error))
        expect("expected list" in str(error))
    else:
        raise AssertionError(
            "malformed source manifest did not fail source-change generation"
        )


def test_source_text_hash_raises_when_declared_text_file_is_missing(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Fail hash generation when a manifest-declared text file is missing."""
    monkeypatch.setitem(source_text_hash.__globals__, "REPO_ROOT", tmp_path)

    try:
        source_text_hash({"textPath": "downloads/text/missing.txt"})
    except FileNotFoundError as error:
        expect("source_text_hash: file not found" in str(error))
    else:
        raise AssertionError("missing declared source text file did not fail")


def test_update_guideline_mappings_asserts_expected_outputs(tmp_path: Path) -> None:
    """Report every missing expected update artifact after generation."""
    present = tmp_path / "present.json"
    missing = tmp_path / "missing.json"
    present.write_text("{}", encoding="utf8")

    try:
        assert_expected_outputs_written((present, missing))
    except AssertionError as error:
        expect("Expected update artifact(s) not written" in str(error))
        expect(str(missing) in str(error))
    else:
        raise AssertionError("missing update artifact did not fail")


def test_validate_manual_mapping_promotions_missing_file_has_no_create_side_effect(
    tmp_path: Path,
) -> None:
    """Validate that missing promotion ledgers fail without creating files."""
    promotions_path = tmp_path / "manual-mapping-promotions.json"

    try:
        validate_manual_mapping_promotions([], promotions_path)
    except FileNotFoundError:
        pass
    else:
        raise AssertionError(
            "missing manual mapping promotions file did not fail validation"
        )

    expect(not promotions_path.exists())


def test_ensure_manual_mapping_promotions_file_creates_empty_ledger(
    tmp_path: Path,
) -> None:
    """Create a valid empty manual-promotion ledger for later validation."""
    promotions_path = tmp_path / "manual-mapping-promotions.json"

    ensure_manual_mapping_promotions_file(promotions_path)

    expect(not validate_manual_mapping_promotions([], promotions_path))
