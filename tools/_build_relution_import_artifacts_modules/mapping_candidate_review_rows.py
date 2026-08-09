"""Build machine-readable mapping candidate review rows."""

from typing import Any

from recommendation_mapping import unique_preserving_order

from .artifact_io import normalize_policy_platform
from .semantic_review_candidates import (
    bilingual_tokens,
    detect_mapping_language,
    extracted_mapping_intent,
    nearest_exact_references,
    ranked_review_candidates,
    recommendation_semantic_concepts,
    recommendation_source_text,
    semantic_review_analysis,
    suggested_review_action,
)


def mapping_candidate_review_row(
    global_id: str,
    recommendation: dict[str, Any],
    current_status: str,
    references_by_platform: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    """Build one review row for a non-exact recommendation mapping."""

    source = str(recommendation["_source"])
    platform = normalize_policy_platform(str(recommendation.get("platform", "")))
    source_text = recommendation_source_text(source, recommendation)
    tokens = bilingual_tokens(source_text, recommendation)
    semantic_ids = [
        str(concept["id"])
        for concept in recommendation_semantic_concepts(recommendation)
    ]
    nearest_references = nearest_exact_references(
        platform,
        tokens,
        semantic_ids,
        references_by_platform.get(platform, []),
        limit=5,
    )
    ranked_candidates = ranked_review_candidates(
        recommendation, tokens, semantic_ids, nearest_references
    )
    extracted_intent = extracted_mapping_intent(source, recommendation, source_text)
    return {
        "source": source,
        "recommendationId": str(recommendation["id"]),
        "globalRecommendationId": global_id,
        "platform": platform,
        "language": detect_mapping_language(source_text),
        "title": str(recommendation.get("title", "")),
        "currentMappingStatus": current_status,
        "currentImplementationCategory": str(
            recommendation.get("implementation", {}).get("category", "gap")
        ),
        "extractedIntent": extracted_intent,
        "normalizedTokens": tokens,
        "semanticConceptIds": semantic_ids,
        "semanticAnalysis": semantic_review_analysis(
            current_status,
            extracted_intent,
            semantic_ids,
            ranked_candidates,
            nearest_references,
        ),
        "nearestExactReferences": nearest_references,
        "rankedCandidates": ranked_candidates,
        "suggestedReviewAction": suggested_review_action(
            current_status, ranked_candidates, nearest_references
        ),
        "blockedBy": mapping_candidate_blockers(recommendation),
    }


def mapping_candidate_blockers(recommendation: dict[str, Any]) -> list[str]:
    """Return mapping notes and implementation blockers that explain review limits."""

    relution_mapping = recommendation.get("relutionMapping", {})
    return unique_preserving_order(
        [
            *[
                str(note)
                for note in relution_mapping.get("notes", [])
                if isinstance(note, str) and note
            ],
            *[
                str(reason)
                for reason in recommendation.get("implementation", {}).get(
                    "blockingReasons", []
                )
                if isinstance(reason, str) and reason
            ],
        ]
    )
