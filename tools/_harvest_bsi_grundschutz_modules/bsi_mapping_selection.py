"""Supports BSI Grundschutz harvesting and recommendation-mapping workflows."""
from __future__ import annotations

import json as _json_reexport
from pathlib import Path as _Path_reexport
from typing import Any

from recommendation_mapping import (
    MANAGEMENT_SUPPORT_CONCEPT_IDS as _MANAGEMENT_SUPPORT_CONCEPT_IDS_reexport,
    android_relution_analog_mappings_for as _android_relution_analog_mappings_for_reexport,
    android_relution_candidates_for as _android_relution_candidates_for_reexport,
    apple_mobileconfig_candidates_for as _apple_mobileconfig_candidates_for_reexport,
    apple_schema_analog_mappings_for as _apple_schema_analog_mappings_for_reexport,
    candidate_from_mapping,
    mapping_candidates as _mapping_candidates_reexport,
)

from .curated_mapping_rules import MAPPING_RULES as _MAPPING_RULES_reexport, extra_relution_mapping_metadata as _extra_relution_mapping_metadata_reexport
from .source_parsers import *  # noqa: F401,F403
from .bsi_mapping_candidates import merge_candidates


json = _json_reexport
Path = _Path_reexport
MANAGEMENT_SUPPORT_CONCEPT_IDS = _MANAGEMENT_SUPPORT_CONCEPT_IDS_reexport
android_relution_analog_mappings_for = _android_relution_analog_mappings_for_reexport
android_relution_candidates_for = _android_relution_candidates_for_reexport
apple_mobileconfig_candidates_for = _apple_mobileconfig_candidates_for_reexport
apple_schema_analog_mappings_for = _apple_schema_analog_mappings_for_reexport
mapping_candidates = _mapping_candidates_reexport
MAPPING_RULES = _MAPPING_RULES_reexport
extra_relution_mapping_metadata = _extra_relution_mapping_metadata_reexport

def bsi_mapping_without_curated_rule(
    inferred: dict[str, list[dict[str, Any]]], semantic_candidates: list[dict[str, Any]]
) -> dict[str, Any]:
    """Choose inferred exact or partial metadata when no curated rule exists."""
    if inferred["androidExactMappings"]:
        return bsi_exact_mapping(
            inferred["androidExactMappings"],
            [
                *semantic_candidates,
                *inferred["androidCandidates"],
                *inferred["inferredCandidates"],
            ],
            (
                "Curated Android Enterprise analogs cover this enforceable BSI requirement "
                "through Relution native policy settings."
            ),
        )
    if inferred["appleExactMappings"]:
        return bsi_exact_mapping(
            inferred["appleExactMappings"],
            [
                *semantic_candidates,
                *inferred["appleMobileconfigCandidates"],
                *inferred["inferredCandidates"],
            ],
            (
                "Curated Apple profile analogs cover this enforceable requirement through "
                "Relution APPLE_MOBILECONFIG-backed schema profiles."
            ),
        )
    partial = bsi_partial_mapping(inferred, semantic_candidates)
    if partial is not None:
        return partial
    return {
        "status": "none",
        "mergeableInImportableRuleset": False,
        "candidates": [],
        "rulesetMappings": [],
        "notes": [],
    }


def bsi_exact_override(
    mapping: dict[str, Any],
    inferred: dict[str, list[dict[str, Any]]],
    semantic_candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Promote non-exact curated metadata only when inferred exact evidence exists."""
    if mapping["status"] == "exact":
        return None
    if inferred["androidExactMappings"]:
        candidates = [
            *mapping["candidates"],
            *[
                candidate_from_mapping(entry)
                for entry in inferred["androidExactMappings"]
            ],
        ]
        return bsi_exact_mapping(
            inferred["androidExactMappings"],
            [
                *semantic_candidates,
                *inferred["androidCandidates"],
                *inferred["inferredCandidates"],
            ],
            (
                "Curated Android Enterprise analogs cover this enforceable BSI requirement "
                "through Relution native policy settings."
            ),
            candidates,
        )
    if inferred["appleExactMappings"]:
        candidates = [
            *mapping["candidates"],
            *[
                candidate_from_mapping(entry)
                for entry in inferred["appleExactMappings"]
            ],
        ]
        return bsi_exact_mapping(
            inferred["appleExactMappings"],
            [
                *semantic_candidates,
                *inferred["appleMobileconfigCandidates"],
                *inferred["inferredCandidates"],
            ],
            (
                "Curated Apple profile analogs cover this enforceable requirement through "
                "Relution APPLE_MOBILECONFIG-backed schema profiles."
            ),
            candidates,
        )
    return None


def bsi_exact_mapping(
    exact_mappings: list[dict[str, Any]],
    inferred_candidates: list[dict[str, Any]],
    note: str,
    base_candidates: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Return importable exact mapping metadata with merged review candidates."""
    candidates = (
        base_candidates
        if base_candidates is not None
        else [candidate_from_mapping(entry) for entry in exact_mappings]
    )
    return {
        "status": "exact",
        "mergeableInImportableRuleset": True,
        "candidates": merge_candidates(candidates, inferred_candidates),
        "rulesetMappings": exact_mappings,
        "notes": [note],
    }


def bsi_partial_mapping(
    inferred: dict[str, list[dict[str, Any]]], semantic_candidates: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """Return partial metadata when related targets exist without exact values."""
    if inferred["androidCandidates"]:
        return bsi_partial_response(
            merge_candidates(
                inferred["androidCandidates"],
                [*semantic_candidates, *inferred["inferredCandidates"]],
            ),
            (
                "Bilingual Android Enterprise setting matching found related Relution settings, "
                "but the BSI requirement is broader or lacks concrete enforceable values."
            ),
        )
    if inferred["inferredCandidates"]:
        candidates = merge_candidates(
            inferred["inferredCandidates"],
            [
                *semantic_candidates,
                *inferred["appleMobileconfigCandidates"],
                *inferred["androidCandidates"],
            ],
        )
        return bsi_partial_response(
            candidates,
            (
                "Bilingual setting-name matching found related Relution/Apple settings, but the "
                "BSI requirement is broader or lacks a concrete enforceable value."
            ),
        )
    if inferred["appleMobileconfigCandidates"]:
        return bsi_partial_response(
            merge_candidates(
                inferred["appleMobileconfigCandidates"], semantic_candidates
            ),
            (
                "Relution can import a related Apple .mobileconfig payload, but the BSI "
                "requirement needs organization-specific values before it can be exact."
            ),
        )
    if semantic_candidates:
        return bsi_partial_response(
            semantic_candidates,
            (
                "BSI/GS++ concept matching found related Relution targets, but exact "
                "remediation requires concrete values and scoped policy decisions."
            ),
        )
    return None


def bsi_partial_response(candidates: list[dict[str, Any]], note: str) -> dict[str, Any]:
    """Build a non-importable partial mapping response with review candidates."""
    return {
        "status": "partial",
        "mergeableInImportableRuleset": False,
        "candidates": candidates,
        "rulesetMappings": [],
        "notes": [note],
    }
