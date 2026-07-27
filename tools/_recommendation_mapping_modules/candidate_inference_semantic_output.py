"""Semantic Output helpers for recommendation mapping."""

from .candidate_inference_common import (
    Any,
    Callable,
    DIRECT_SEMANTIC_SOURCES,
    FieldEntry,
    GS_PLUSPLUS_SEMANTIC_SOURCES,
    MANAGEMENT_SUPPORT_CONCEPT_IDS,
    RELATED_SEMANTIC_SOURCES,
)

from .candidate_inference_semantic_sources import (
    is_process_only_evidence,
)

def semantic_concepts_for_field(
    platform: str, field: FieldEntry
) -> list[dict[str, Any]]:
    """Infer semantic concepts represented by a Relution or Apple field."""
    source = (
        "apple-schema-field"
        if field.kind == "apple-schema-profile"
        else "relution-field"
    )
    text_parts = [
        field.target,
        field.field_path,
        field.label,
        field.field_kind,
        " ".join(field.enum_values),
    ]
    from .candidate_inference_semantic_concepts import semantic_concepts_for

    return semantic_concepts_for(
        platform,
        [
            {
                "source": source,
                "sourceId": f"{field.kind}:{field.target}:{field.field_path}",
                "text": " ".join(part for part in text_parts if part),
                "confidence": 0.72,
            }
        ],
    )
def semantic_no_concept_reason(evidence_sources: list[dict[str, Any]]) -> str:
    """Explain why no semantic concept was emitted for evidence sources."""
    if is_process_only_evidence(evidence_sources):
        return (
            "Process-only physical, power, or emergency-planning wording; no concrete "
            "Relution policy candidate was emitted by the semantic layer."
        )
    return "No curated shared security concept matched the available evidence."
def semantic_metadata_for(
    evidence_sources: list[dict[str, Any]], semantic_concepts: list[dict[str, Any]]
) -> dict[str, Any]:
    """Build semantic metadata for matched or unmatched evidence sources."""
    if semantic_concepts:
        return {"semanticConcepts": semantic_concepts}
    return {"semanticNoConceptReason": semantic_no_concept_reason(evidence_sources)}
def semantic_evidence_source_records(
    recommendation_id: str,
    sources: list[tuple[str, str, float]],
    has_text: Callable[[str], bool],
) -> list[dict[str, Any]]:
    """Build normalized semantic evidence records from source text tuples."""
    return [
        {
            "source": source,
            "sourceId": recommendation_id,
            "text": text,
            "confidence": confidence,
        }
        for source, text, confidence in sources
        if has_text(text)
    ]
def semantic_concept_sort_key(concept: dict[str, Any]) -> tuple[int, int, float, str]:
    """Sort concepts by actionability, evidence source quality, and confidence."""
    concept_id = str(concept.get("id", ""))
    return (
        1 if concept_id in MANAGEMENT_SUPPORT_CONCEPT_IDS else 0,
        semantic_concept_source_rank(concept),
        -float(concept.get("confidence", 0.0)),
        concept_id,
    )
def semantic_concept_source_rank(concept: dict[str, Any]) -> int:
    """Rank the strongest evidence-source family attached to a concept."""
    evidence = concept.get("evidence", [])
    sources = {
        str(entry.get("source", "")) for entry in evidence if isinstance(entry, dict)
    }
    if sources.intersection(DIRECT_SEMANTIC_SOURCES):
        return 0
    if sources.intersection(RELATED_SEMANTIC_SOURCES):
        return 1
    if sources.intersection(GS_PLUSPLUS_SEMANTIC_SOURCES):
        return 2
    return 3
