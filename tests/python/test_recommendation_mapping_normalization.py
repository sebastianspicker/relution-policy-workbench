"""Tests for recommendation-mapping normalization and promotions."""

from python_tool_helpers import expect, import_tool


artifact_module = import_tool("build_relution_import_artifacts")

normalize_recommendations = artifact_module.normalize_recommendations
relution_mapping_snapshot = artifact_module.relution_mapping_snapshot


def test_normalize_recommendations_reports_dropped_optional_mapping_evidence() -> None:
    """Preserve valid optional mapping evidence and report dropped malformed items."""
    normalized = normalize_recommendations(
        "vendor",
        [
            {
                "id": "candidate-evidence",
                "platform": "IOS",
                "title": "Candidate evidence",
                "relutionMapping": {
                    "status": "partial",
                    "candidates": [
                        {"kind": "relution-native", "target": "IOS_PASSCODE"},
                        "not-a-candidate",
                    ],
                    "rulesetMappings": ["not-a-mapping"],
                },
                "fallbackTranslations": [
                    {"kind": "helper", "text": "Use helper"},
                    "not-a-helper",
                ],
            },
            {
                "id": "malformed-fallback",
                "platform": "IOS",
                "title": "Malformed fallback",
                "relutionMapping": {"status": "none"},
                "fallbackTranslations": "not-a-list",
            },
        ],
    )

    first_fields = diagnostics_by_field(normalized[0]["normalizationDiagnostics"])
    expect(first_fields["relutionMapping.candidates"]["droppedCount"] == 1)
    expect(first_fields["relutionMapping.rulesetMappings"]["droppedCount"] == 1)
    expect(first_fields["fallbackTranslations"]["droppedCount"] == 1)
    expect(
        first_fields["relutionMapping.candidates"]["recommendationId"]
        == "candidate-evidence"
    )
    expect(
        normalized[0]["relutionMapping"]["candidates"]
        == [{"kind": "relution-native", "target": "IOS_PASSCODE"}]
    )
    expect(
        normalized[0]["fallbackTranslations"]
        == [{"kind": "helper", "text": "Use helper"}]
    )

    second_fields = diagnostics_by_field(normalized[1]["normalizationDiagnostics"])
    expect(second_fields["fallbackTranslations"]["droppedCount"] == 1)
    expect(
        second_fields["fallbackTranslations"]["recommendationId"]
        == "malformed-fallback"
    )
    expect(normalized[1]["fallbackTranslations"] == [])


def test_relution_mapping_snapshot_reports_dropped_ranked_candidate_evidence() -> None:
    """Report malformed ranked-candidate review evidence in mapping snapshots."""
    snapshot = relution_mapping_snapshot(
        {
            "_source": "vendor",
            "_globalId": "vendor:candidate-snapshot",
            "id": "candidate-snapshot",
            "platform": "IOS",
            "title": "Candidate snapshot",
            "reason": "Candidate evidence should stay attributable.",
            "relutionMapping": {"status": "partial"},
            "implementation": {"category": "relution-partial"},
        },
        [],
        {
            "rankedCandidates": [
                {
                    "kind": "relution-native",
                    "target": "IOS_PASSCODE",
                    "fieldPaths": ["minLength", 4],
                    "referenceMappingIds": ["ref-1", None],
                    "semanticConceptId": "passcode_authentication",
                },
                "not-a-candidate",
            ],
        },
    )

    expect(
        snapshot["candidateMappings"]
        == [
            {
                "kind": "relution-native",
                "target": "IOS_PASSCODE",
                "fieldPaths": ["minLength"],
                "referenceMappingIds": ["ref-1"],
                "semanticConceptId": "passcode_authentication",
            }
        ]
    )
    fields = diagnostics_by_field(snapshot["normalizationDiagnostics"])
    expect(fields["review.rankedCandidates"]["droppedCount"] == 1)
    expect(fields["candidateMappings[0].fieldPaths"]["droppedCount"] == 1)
    expect(fields["candidateMappings[0].referenceMappingIds"]["droppedCount"] == 1)
    expect(
        fields["review.rankedCandidates"]["recommendationId"] == "candidate-snapshot"
    )


def diagnostics_by_field(diagnostics: object) -> dict[str, dict[str, object]]:
    """Index normalization diagnostics by field for focused assertions."""
    expect(isinstance(diagnostics, list))
    return {
        str(entry["field"]): entry for entry in diagnostics if isinstance(entry, dict)
    }


def test_normalize_recommendations_without_provider_does_not_apply_promotions() -> None:
    """Leave recommendations unpromoted when no manual-promotion provider is given."""
    normalized = normalize_recommendations("bsi", [promotable_recommendation()])

    expect(normalized[0]["relutionMapping"]["status"] == "none")
    expect(normalized[0]["relutionMapping"]["rulesetMappings"] == [])


def test_normalize_recommendations_applies_explicit_promotions() -> None:
    """Apply validated manual promotions as exact importable mappings."""
    mapping = {
        "kind": "relution-native",
        "type": "IOS_PASSCODE",
        "values": {"enabled": True},
    }
    normalized = normalize_recommendations(
        "bsi",
        [promotable_recommendation()],
        get_promotions=lambda source: {"rec-1": [mapping]} if source == "bsi" else {},
    )

    relution_mapping = normalized[0]["relutionMapping"]
    expect(relution_mapping["status"] == "exact")
    expect(relution_mapping["mergeableInImportableRuleset"] is True)
    expect(relution_mapping["rulesetMappings"] == [mapping])
    expect(
        "Exact mapping promoted by validated manual mapping ledger."
        in relution_mapping["notes"]
    )


def promotable_recommendation() -> dict[str, object]:
    """Return the minimal recommendation shape used by promotion tests."""
    return {
        "id": "rec-1",
        "platform": "IOS",
        "title": "Require passcode",
        "relutionMapping": {"status": "none"},
    }
