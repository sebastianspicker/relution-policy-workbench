"""Focused contracts for mapping candidate review rows and Markdown output."""

from __future__ import annotations

import importlib
from pathlib import Path
from typing import Any

from python_tool_helpers import expect


rows = importlib.import_module(
    "_build_relution_import_artifacts_modules.mapping_candidate_review_rows"
)
markdown = importlib.import_module(
    "_build_relution_import_artifacts_modules.mapping_candidate_review_markdown"
)
output = importlib.import_module(
    "_build_relution_import_artifacts_modules.mapping_candidate_review_output"
)


def test_candidate_row_has_stable_keys_and_semantic_call_order(
    monkeypatch: object,
) -> None:
    """Preserve row schema, reference cap, and semantic dependency order."""

    calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]] = []

    def stub(name: str, result: Any):
        def invoke(*args: Any, **kwargs: Any) -> Any:
            calls.append((name, args, kwargs))
            return result

        return invoke

    monkeypatch.setattr(rows, "normalize_policy_platform", stub("platform", "IOS"))
    monkeypatch.setattr(rows, "recommendation_source_text", stub("source_text", "Text"))
    monkeypatch.setattr(rows, "bilingual_tokens", stub("tokens", ["token"]))
    monkeypatch.setattr(
        rows, "recommendation_semantic_concepts", stub("concepts", [{"id": "concept"}])
    )
    monkeypatch.setattr(rows, "nearest_exact_references", stub("nearest", [{"id": "ref"}]))
    monkeypatch.setattr(rows, "ranked_review_candidates", stub("ranked", [{"id": "candidate"}]))
    monkeypatch.setattr(rows, "extracted_mapping_intent", stub("intent", {"action": "set"}))
    monkeypatch.setattr(rows, "detect_mapping_language", stub("language", "en"))
    monkeypatch.setattr(rows, "semantic_review_analysis", stub("analysis", {"fit": "partial"}))
    monkeypatch.setattr(rows, "suggested_review_action", stub("action", "review"))

    row = rows.mapping_candidate_review_row(
        "bsi:1",
        {
            "_source": "bsi",
            "id": "1",
            "platform": "ios",
            "title": "Title",
            "implementation": {"category": "partial", "blockingReasons": ["review"]},
            "relutionMapping": {"notes": ["review"]},
        },
        "partial",
        {"IOS": [{"id": "ref"}]},
    )

    expect(
        list(row)
        == [
            "source",
            "recommendationId",
            "globalRecommendationId",
            "platform",
            "language",
            "title",
            "currentMappingStatus",
            "currentImplementationCategory",
            "extractedIntent",
            "normalizedTokens",
            "semanticConceptIds",
            "semanticAnalysis",
            "nearestExactReferences",
            "rankedCandidates",
            "suggestedReviewAction",
            "blockedBy",
        ]
    )
    expect([name for name, _, _ in calls] == [
        "platform", "source_text", "tokens", "concepts", "nearest", "ranked", "intent",
        "language", "analysis", "action",
    ])
    nearest_call = next(call for call in calls if call[0] == "nearest")
    expect(nearest_call[2]["limit"] == 5)
    expect(row["blockedBy"] == ["review"])


def test_candidate_blockers_filter_and_deduplicate_in_input_order() -> None:
    """Keep non-empty string filtering and ordered deduplication intact."""

    blockers = rows.mapping_candidate_blockers(
        {
            "relutionMapping": {"notes": ["first", "", 1, "second", "first"]},
            "implementation": {"blockingReasons": ["second", "third", None, ""]},
        }
    )

    expect(blockers == ["first", "second", "third"])


def test_markdown_renderer_is_sorted_and_has_exactly_one_trailing_newline() -> None:
    """Render stable JSON summaries and stable queue ordering without I/O."""

    rendered = markdown.render_mapping_candidate_review_report(
        {"summary": {"bySource": {"vendor": 1, "bsi": 2}, "byLanguage": {"en": 1, "de": 2}}},
        {
            "generatedAt": "2026-08-05T00:00:00Z",
            "summary": {
                "exactReferenceCount": 3,
                "totalReviewedRecommendations": 4,
                "bySuggestedReviewAction": {"z-last": 1, "a-first": 2, "b-second": 2},
            },
        },
    )

    expect(rendered.endswith("\n"))
    expect(not rendered.endswith("\n\n"))
    expect("`{\"bsi\": 2, \"vendor\": 1}`" in rendered)
    expect(rendered.index("`a-first`: `2`") < rendered.index("`b-second`: `2`"))
    expect(rendered.index("`b-second`: `2`") < rendered.index("`z-last`: `1`"))


def test_writer_creates_parent_and_writes_renderer_bytes(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Keep the facade writer's parent creation and UTF-8 byte contract."""

    report_path = tmp_path / "nested" / "report.md"
    reference_payload = {"summary": {"bySource": {}, "byLanguage": {}}}
    review_payload = {
        "generatedAt": "2026-08-05T00:00:00Z",
        "summary": {
            "exactReferenceCount": 0,
            "totalReviewedRecommendations": 0,
            "bySuggestedReviewAction": {},
        },
    }
    monkeypatch.setattr(output, "MAPPING_CANDIDATE_REVIEW_REPORT_PATH", report_path)

    output.write_mapping_candidate_review_report(reference_payload, review_payload)

    expect(report_path.read_bytes() == markdown.render_mapping_candidate_review_report(reference_payload, review_payload).encode("utf8"))
