"""Tests for non-CIS semantic concept matching in recommendation mapping."""

from pathlib import Path
import zipfile

from defusedxml import ElementTree as ET

from python_tool_helpers import evidence, expect, import_tool, semantic_concept_ids


bsi_module = import_tool("harvest_bsi_grundschutz")
cis_module = import_tool("harvest_cis_benchmarks")
recommendation_mapping_module = import_tool("recommendation_mapping")

build_setting_index = recommendation_mapping_module.build_setting_index
merge_candidates = cis_module.merge_candidates
parse_module_description = bsi_module.parse_module_description
parse_module_threats = bsi_module.parse_module_threats
parse_shared_strings = bsi_module.parse_shared_strings
semantic_concepts_for = recommendation_mapping_module.semantic_concepts_for
semantic_concepts_for_field = recommendation_mapping_module.semantic_concepts_for_field
semantic_no_concept_reason = recommendation_mapping_module.semantic_no_concept_reason


DOCBOOK_NS_URI = "http://docbook.org/ns/docbook"


def test_generic_policy_audit_and_location_words_do_not_overmatch_management_concepts() -> (
    None
):
    """Verify generic audit/location wording does not imply management concepts."""

    concepts = semantic_concepts_for(
        "WINDOWS",
        evidence(
            "Review the policy setting at the documented registry location during the audit.",
            source="vendor-reason",
        ),
    )

    ids = {concept["id"] for concept in concepts}
    expect("mdm_compliance" not in ids)
    expect("logging_compliance" not in ids)
    expect("location" not in ids)


def test_parse_shared_strings_warns_on_missing_xml(
    tmp_path: Path, capsys: object
) -> None:
    """Verify missing workbook shared strings are diagnostic, not silent."""

    workbook_path = tmp_path / "workbook.xlsx"
    with zipfile.ZipFile(workbook_path, "w") as archive:
        archive.writestr("xl/workbook.xml", "")

    with zipfile.ZipFile(workbook_path) as archive:
        expect(parse_shared_strings(archive) == [])

    expect(
        "WARNING: sharedStrings.xml not found in workbook" in capsys.readouterr().err
    )


def test_docbook_optional_sections_warn_when_missing(capsys: object) -> None:
    """Verify missing optional DocBook sections are visible in diagnostics."""

    module_section = ET.fromstring(
        f'<section xmlns="{DOCBOOK_NS_URI}"><title>SYS.2.1 Allgemeiner Client</title></section>'
    )

    expect(not parse_module_description(module_section))
    expect(not parse_module_threats(module_section))

    stderr = capsys.readouterr().err
    expect("expected DocBook section 'Beschreibung' not found" in stderr)
    expect("expected DocBook section 'Gefährdungslage' not found" in stderr)


def test_cis_candidate_merge_keeps_exact_and_curated_candidates_first() -> None:
    """Verify exact and inferred CIS candidates stay ahead of semantic fallbacks."""

    exact_candidate = {
        "kind": "relution-native",
        "target": "IOS_PASSCODE",
        "fieldPaths": ["minLength"],
    }
    inferred_candidate = {
        "kind": "apple-mobileconfig",
        "target": "com.apple.shareddeviceconfiguration",
        "fieldPaths": ["lockScreenFootnote"],
    }
    semantic_candidate = {
        "kind": "relution-native",
        "target": "IOS_APP_COMPLIANCE",
        "fieldPaths": ["requiredApps"],
        "semanticConceptId": "mdm_compliance",
    }

    expect(
        merge_candidates([exact_candidate, inferred_candidate], [semantic_candidate])
        == [
            exact_candidate,
            inferred_candidate,
            semantic_candidate,
        ]
    )


def test_relution_field_semantics_map_targets_back_to_concepts() -> None:
    """Verify Relution field metadata maps back to semantic concepts."""

    fields = build_setting_index()
    ios_min_length = next(
        field
        for field in fields["IOS"]
        if field.kind == "relution-native"
        and field.target == "IOS_PASSCODE"
        and field.field_path == "minLength"
    )
    windows_script_scan = next(
        field
        for field in fields["WINDOWS"]
        if field.kind == "relution-native"
        and field.target == "WINDOWS_ANTIVIRUS"
        and field.field_path == "allowScriptScanning"
    )

    expect(
        "passcode_authentication"
        in {
            concept["id"]
            for concept in semantic_concepts_for_field("IOS", ios_min_length)
        }
    )
    expect(
        "malware_protection"
        in {
            concept["id"]
            for concept in semantic_concepts_for_field("WINDOWS", windows_script_scan)
        }
    )


def test_generic_app_wording_does_not_overmatch_app_allowlist() -> None:
    """Verify generic app update wording does not imply app allowlisting."""

    expect(
        "app_allowlist"
        not in semantic_concept_ids("MACOS", "Automatically install app updates.")
    )
    expect(
        semantic_concept_ids(
            "ANDROID_ENTERPRISE", "Google Play Protect verify apps enforced"
        )
        == {"malware_protection"}
    )


def test_process_only_power_wording_stays_unmapped_without_relution_surface() -> None:
    """Verify physical power-process wording stays unmapped without a device setting."""

    sources = [
        {
            "source": "bsi-title",
            "text": "Unterbrechungsfreie und stabile Stromversorgung",
            "confidence": 0.9,
        },
        {
            "source": "bsi-requirement",
            "text": (
                "Clients SOLLTEN an eine unterbrechungsfreie Stromversorgung angeschlossen "
                "werden."
            ),
            "confidence": 0.78,
        },
    ]

    expect(not semantic_concepts_for("WINDOWS", sources))
    expect(semantic_no_concept_reason(sources).startswith("Process-only physical"))
