"""Regression coverage for the vendor-source facade and extracted pipeline."""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

from python_tool_helpers import TOOLS_DIR, expect, import_tool


vendor_sources = import_tool("_harvest_vendor_guidance_modules.vendor_sources")
vendor_source_catalog = importlib.import_module(
    "_harvest_vendor_guidance_modules.vendor_source_catalog"
)
vendor_source_pipeline = importlib.import_module(
    "_harvest_vendor_guidance_modules.vendor_source_pipeline"
)


def test_vendor_sources_preserves_compatibility_surface() -> None:
    """Keep the legacy facade's exact exports and shared module attributes."""

    expect(
        vendor_sources.__all__
        == [
            "CURATED_PLATFORM_GUIDANCE",
            "MAX_VENDOR_DOWNLOAD_BYTES",
            "PUBLIC_TOKEN_REDACTIONS",
            "SAFE_SOURCE_ID_RE",
            "TextExtractor",
            "android_relution_analog_mappings_for",
            "android_relution_candidates_for",
            "build_curated_recommendation",
            "build_recommendations",
            "candidate_from_mapping",
            "compact_slug",
            "copy_downloads",
            "curated_mapping_context",
            "download_vendor_source",
            "extract_text",
            "main",
            "merge_candidate_lists",
            "redact_public_tokens",
            "refresh_downloads",
            "refresh_vendor_source",
            "relative_output_path",
            "resolved_vendor_url_ips",
            "safe_vendor_source_id",
            "semantic_candidates_for",
            "semantic_concepts_for",
            "semantic_metadata_for",
            "shared_mapping_candidates",
            "trusted_vendor_source_request",
            "validate_vendor_source_url",
            "vendor_analog_mappings",
            "vendor_download_path",
            "vendor_exact_mapping",
            "vendor_relution_mapping",
            "vendor_ruleset_mappings",
            "vendor_semantic_context",
            "vendor_semantic_evidence_sources_for",
            "vendor_source_output_paths",
        ]
    )
    expect(
        vendor_sources.CURATED_PLATFORM_GUIDANCE
        is vendor_source_catalog.CURATED_PLATFORM_GUIDANCE
    )
    expect(vendor_sources.build_recommendations is vendor_source_pipeline.build_recommendations)
    expect(vendor_sources.write_json is vendor_source_pipeline.write_json)
    expect(callable(vendor_sources.main))


def test_vendor_source_catalog_keeps_representative_guidance() -> None:
    """Keep Windows path constants and representative platform mappings stable."""

    guidance = vendor_source_catalog.CURATED_PLATFORM_GUIDANCE
    expect(len(guidance) == 38)
    expect([row["platform"] for row in guidance].count("ANDROID") == 19)
    expect([row["platform"] for row in guidance].count("MACOS") == 19)
    expect(guidance[0]["mapping"] == (
        "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES",
        {"googlePlayProtectVerifyApps": "VERIFY_APPS_ENFORCED"},
    ))
    expect(guidance[-1]["title"] == "Use Managed Device Attestation for trust evaluation")
    expect(
        vendor_source_catalog.WINDOWS_BASELINE_PATH
        == TOOLS_DIR.parent
        / "example/vendor-references/downloads/derived/windows-25h2-intune-baseline.json"
    )


def test_vendor_source_pipeline_builds_stable_recommendations() -> None:
    """Keep curated ordering and Windows recommendation inclusion stable."""

    recommendations = vendor_source_pipeline.build_recommendations({})

    expect(len(recommendations) > len(vendor_source_catalog.CURATED_PLATFORM_GUIDANCE))
    expect(recommendations[0]["id"] == "android-001-enforcegoogleplayprotectonmanageddevices")
    expect(recommendations[19]["id"] == "macos-001-enablefilevaultonmanagedmacs")
    expect(recommendations[-1]["platform"] == "WINDOWS")


def test_offline_vendor_source_pipeline_writes_normalized_artifacts(tmp_path: Path) -> None:
    """Build the alternate output tree without refreshing network sources."""

    vendor_source_pipeline.harvest_vendor_guidance(tmp_path, refresh=False)

    output = tmp_path / "example/vendor-references"
    source = TOOLS_DIR.parent / "example/vendor-references"
    expect((output / "sources.json").read_bytes() == (source / "sources.json").read_bytes())
    expect(
        (output / "downloads/derived/windows-25h2-intune-baseline.json").read_bytes()
        == (source / "downloads/derived/windows-25h2-intune-baseline.json").read_bytes()
    )
    recommendations = json.loads(
        (output / "vendor-recommendations.json").read_text(encoding="utf8")
    )
    expect(recommendations[0]["id"] == "android-001-enforcegoogleplayprotectonmanageddevices")
    expect(recommendations[-1]["platform"] == "WINDOWS")


def test_vendor_source_cli_forwards_offline_output_root(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward alternate-root offline CLI input to the extracted pipeline."""

    calls: list[tuple[Path, bool]] = []
    monkeypatch.setattr(vendor_sources, "harvest_vendor_guidance", lambda root, refresh: calls.append((root, refresh)))
    monkeypatch.setattr(
        sys,
        "argv",
        ["harvest_vendor_guidance.py", "--offline", "--output-root", str(tmp_path)],
    )

    vendor_sources.main()

    expect(calls == [(tmp_path, False)])


def test_vendor_source_cli_forwards_refresh_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward the refresh flag with the repository output root by default."""

    calls: list[tuple[Path, bool]] = []
    monkeypatch.setattr(vendor_sources, "harvest_vendor_guidance", lambda root, refresh: calls.append((root, refresh)))
    monkeypatch.setattr(sys, "argv", ["harvest_vendor_guidance.py", "--refresh"])

    vendor_sources.main()

    expect(calls == [(vendor_sources.REPO_ROOT, True)])


def test_vendor_source_cli_rejects_conflicting_modes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep offline and refresh mutually exclusive before pipeline dispatch."""

    calls: list[tuple[Path, bool]] = []
    monkeypatch.setattr(vendor_sources, "harvest_vendor_guidance", lambda root, refresh: calls.append((root, refresh)))
    monkeypatch.setattr(
        sys,
        "argv",
        ["harvest_vendor_guidance.py", "--offline", "--refresh"],
    )

    with pytest.raises(SystemExit):
        vendor_sources.main()

    expect(calls == [])
