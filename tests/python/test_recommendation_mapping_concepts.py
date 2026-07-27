"""Tests for recommendation-mapping semantic concept matching."""

from python_tool_helpers import evidence, expect, import_tool, semantic_concept_ids


recommendation_mapping_module = import_tool("recommendation_mapping")

semantic_candidates_for = recommendation_mapping_module.semantic_candidates_for
semantic_concepts_for = recommendation_mapping_module.semantic_concepts_for


def test_german_bsi_passcode_wording_maps_to_canonical_concept() -> None:
    """Map German BSI passcode wording to the canonical authentication concept."""
    concepts = semantic_concepts_for(
        "WINDOWS",
        evidence(
            (
                "Benutzende MUESSEN eine Bildschirmsperre verwenden und sich mit einem sicheren "
                "Kennwort authentisieren."
            )
        ),
    )

    expect("passcode_authentication" in {concept["id"] for concept in concepts})
    candidates = semantic_candidates_for("WINDOWS", concepts)
    expect(any(candidate["target"] == "WINDOWS_PASSCODE" for candidate in candidates))


def test_english_vendor_wording_maps_to_same_concept() -> None:
    """Keep English and German passcode wording on the same semantic concept."""
    german_ids = semantic_concept_ids(
        "IOS", "Der Geraetecode muss automatisch nach Inaktivitaet gesperrt werden."
    )
    english_ids = semantic_concept_ids(
        "IOS", "Require a passcode and automatically lock the device after idle time."
    )

    expect("passcode_authentication" in german_ids)
    expect("passcode_authentication" in english_ids)
    expect(german_ids.intersection(english_ids))


def test_camera_microphone_phrase_is_not_camera_only_exact_semantics() -> None:
    """Avoid treating combined camera/microphone wording as camera-only exact intent."""
    concepts = semantic_concepts_for(
        "ANDROID_ENTERPRISE",
        evidence(
            "Die unautorisierte Nutzung von Rechnermikrofonen und Kameras muss verhindert werden."
        ),
    )

    expect("camera_microphone" in {concept["id"] for concept in concepts})
    expect("camera" not in {concept["id"] for concept in concepts})
    candidates = semantic_candidates_for("ANDROID_ENTERPRISE", concepts)
    camera_candidates = [
        candidate
        for candidate in candidates
        if candidate["target"] == "ANDROID_ENTERPRISE_DISABLE_CAMERAS"
    ]
    expect(camera_candidates)
    expect(
        all(
            candidate["match"]["valueCompatibility"] == "concept-candidate"
            for candidate in camera_candidates
        )
    )
