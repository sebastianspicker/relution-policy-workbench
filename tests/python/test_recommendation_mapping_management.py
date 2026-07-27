"""Tests for recommendation-mapping semantic management concepts."""

from python_tool_helpers import evidence, expect, import_tool


recommendation_mapping_module = import_tool("recommendation_mapping")

semantic_candidates_for = recommendation_mapping_module.semantic_candidates_for
semantic_concepts_for = recommendation_mapping_module.semantic_concepts_for


def test_german_policy_mdm_and_admin_wording_maps_to_management_support_concepts() -> (
    None
):
    """Map German MDM/admin governance wording to support candidates only."""
    concepts = semantic_concepts_for(
        "WINDOWS",
        evidence(
            "Lokale Sicherheitsrichtlinien muessen ueber ein Managementsystem verwaltet werden; "
            "Administrationsverfahren und Konfigurationsaenderungen sind zu dokumentieren.",
        ),
    )

    ids = {concept["id"] for concept in concepts}
    expect(
        {
            "policy_governance",
            "administration_procedures",
            "reference_configuration_rollout",
        }
        <= ids
    )

    candidates = semantic_candidates_for("WINDOWS", concepts)
    expect(
        any(
            candidate["target"] == "WINDOWS_LOCAL_DEVICE_SECURITY"
            for candidate in candidates
        )
    )
    expect(any(candidate["target"] == "WINDOWS_CUSTOM_CSP" for candidate in candidates))
    expect(any(candidate["target"] == "WINDOWS_COMPANION" for candidate in candidates))
    expect(
        all(
            candidate["match"]["valueCompatibility"] == "concept-candidate"
            for candidate in candidates
        )
    )


def test_hardened_device_wording_maps_to_security_candidates_without_exact_remediation() -> (
    None
):
    """Map hardened-device procurement wording to non-exact security candidates."""
    concepts = semantic_concepts_for(
        "ANDROID_ENTERPRISE",
        evidence(
            (
                "Institutionen SOLLTEN besonders abgesicherte mobile Endgeraete mit geeigneter "
                "sicherer Hardware einsetzen."
            )
        ),
    )

    expect("hardened_device_procurement" in {concept["id"] for concept in concepts})
    candidates = semantic_candidates_for("ANDROID_ENTERPRISE", concepts)
    expect(
        any(
            candidate["target"] == "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES"
            for candidate in candidates
        )
    )
    expect(
        any(
            candidate["target"] == "ANDROID_ENTERPRISE_COMPLIANCE_ENFORCEMENT"
            for candidate in candidates
        )
    )
    expect(
        all(
            candidate["match"]["valueCompatibility"] == "concept-candidate"
            for candidate in candidates
        )
    )
