"""Tests for CIS semantic matching in recommendation mapping."""

from python_tool_helpers import expect, import_tool


cis_module = import_tool("harvest_cis_benchmarks")
recommendation_mapping_module = import_tool("recommendation_mapping")

BenchmarkDetails = cis_module.BenchmarkDetails
BenchmarkSpec = cis_module.BenchmarkSpec
cis_semantic_candidates_for = cis_module.cis_semantic_candidates_for
cis_semantic_evidence_sources_for = cis_module.cis_semantic_evidence_sources_for
parse_benchmark = cis_module.parse_benchmark
semantic_concepts_for = recommendation_mapping_module.semantic_concepts_for


def test_cis_semantic_evidence_uses_title_and_operational_sections() -> None:
    """Verify CIS evidence preserves source sections for semantic matching."""

    sources = cis_semantic_evidence_sources_for(
        "4.5",
        "Ensure all devices are marked as compliant",
        "Enabled",
        {
            "description": "All enrolled devices should report compliance state to the MDM.",
            "rationale": "Compliance makes policy drift visible.",
            "audit": "Verify device compliance in the management console.",
            "remediation": "Mark non-compliant devices and require the managed app.",
            "defaultValue": "Not configured.",
        },
    )

    expect(
        [source["source"] for source in sources]
        == [
            "cis-title",
            "cis-description",
            "cis-rationale",
            "cis-audit",
            "cis-remediation",
            "cis-default-value",
            "cis-recommended-value",
        ]
    )
    expect({source["sourceId"] for source in sources} == {"4.5"})


def test_cis_ios_compliance_wording_maps_to_semantic_partial_candidate() -> None:
    """Verify CIS compliance wording maps to partial MDM compliance candidates."""

    sources = cis_semantic_evidence_sources_for(
        "4.5",
        "Ensure all devices are marked as compliant",
        None,
        {
            "description": (
                "Devices must remain compliant with the organization mobile device management "
                "policy."
            )
        },
    )
    concepts = semantic_concepts_for("IOS", sources)

    expect("mdm_compliance" in {concept["id"] for concept in concepts})
    candidates = cis_semantic_candidates_for(
        "IOS", "4.5", "Ensure all devices are marked as compliant", concepts
    )
    expect(any(candidate["target"] == "IOS_APP_COMPLIANCE" for candidate in candidates))
    expect(
        all(
            candidate["match"]["valueCompatibility"] == "concept-candidate"
            for candidate in candidates
        )
    )


def test_cis_ios_latest_device_architecture_maps_to_hardened_device_candidates() -> (
    None
):
    """Verify high-value target wording maps to hardened-device candidates."""

    sources = cis_semantic_evidence_sources_for(
        "4.9",
        "Ensure the latest iOS device architecture is used by high-value targets",
        None,
        {
            "rationale": (
                "High-value targets should use current hardware architecture for stronger "
                "platform protections."
            )
        },
    )
    concepts = semantic_concepts_for("IOS", sources)

    expect("hardened_device_procurement" in {concept["id"] for concept in concepts})
    candidate_targets = {
        candidate["target"]
        for candidate in cis_semantic_candidates_for(
            "IOS",
            "4.9",
            "Ensure the latest iOS device architecture is used by high-value targets",
            concepts,
        )
    }
    expect(
        {"IOS_RESTRICTION", "IOS_SECURED_SHARED_DEVICE", "IOS_SHARED_DEVICE"}
        <= candidate_targets
    )


def test_cis_windows_service_and_user_rights_semantics_do_not_create_candidates() -> (
    None
):
    """Verify helper-only Windows service/user-rights entries stay unmapped."""

    service_sources = cis_semantic_evidence_sources_for(
        "5.1",
        "Ensure 'Bluetooth Audio Gateway Service (BTAGService)' is set to 'Disabled'",
        "Disabled",
        {"remediation": "Run Set-Service -Name BTAGService -StartupType Disabled."},
    )
    user_right_sources = cis_semantic_evidence_sources_for(
        "2.2.4",
        (
            "Ensure 'Adjust memory quotas for a process' is set to 'Administrators, LOCAL "
            "SERVICE, NETWORK SERVICE'"
        ),
        None,
        {"remediation": "Configure the User Rights Assignment policy."},
    )

    service_concepts = semantic_concepts_for("WINDOWS", service_sources)
    user_right_concepts = semantic_concepts_for("WINDOWS", user_right_sources)

    expect(
        cis_semantic_candidates_for(
            "WINDOWS",
            "5.1",
            "Ensure 'Bluetooth Audio Gateway Service (BTAGService)' is set to 'Disabled'",
            service_concepts,
        )
        == []
    )
    expect(
        cis_semantic_candidates_for(
            "WINDOWS",
            "2.2.4",
            (
                "Ensure 'Adjust memory quotas for a process' is set to 'Administrators, LOCAL "
                "SERVICE, NETWORK SERVICE'"
            ),
            user_right_concepts,
        )
        == []
    )


def test_cis_windows_helper_only_skip_is_visible(capsys: object) -> None:
    """Verify helper-only CIS skips are visible in generator diagnostics."""

    expect(
        cis_semantic_candidates_for(
            "WINDOWS", "5.1", "Ensure Bluetooth service is set to Disabled", []
        )
        == []
    )

    expect(
        "INFO: skipping helper-only CIS recommendation 5.1" in capsys.readouterr().err
    )


def test_cis_benchmark_parser_reports_helper_only_skip_count(capsys: object) -> None:
    """Verify parser diagnostics summarize helper-only CIS recommendations."""

    pdf_text = "\n".join(
        [
            "5.1 Ensure Bluetooth service is set to Disabled (Automated)",
            "Profile Applicability:",
            "Level 1",
            "Description:",
            "Disable Bluetooth service.",
            "Remediation:",
            "Run Set-Service -Name BTAGService -StartupType Disabled.",
            "",
            "18.1.1 Ensure normal password setting is Enabled (Automated)",
            "Profile Applicability:",
            "Level 1",
            "Description:",
            "Require password settings.",
        ]
    )
    benchmark = BenchmarkSpec(
        benchmark_id="cis-test",
        file_name="fake.pdf",
        benchmark_title="CIS Test Benchmark",
        platform="WINDOWS",
        family_source_id="cis-windows-test",
        management_surface="WINDOWS_GROUP_POLICY",
        details=BenchmarkDetails(
            os_family="WINDOWS", version="1.0.0", document_date="2026-05-28"
        ),
    )

    recommendations = parse_benchmark(
        benchmark, {}, {}, {}, pdf_text_extractor=lambda path: pdf_text
    )

    expect(len(recommendations) == 2)
    expect(
        "Skipped 1 helper-only items (not semantic candidates)"
        in capsys.readouterr().err
    )
