"""Semantic concept rules for authentication, updates, and network controls."""

from .mapping_types_and_constants import SemanticConceptRule
from ._semantic_concept_rules_part1_core import SEMANTIC_CONCEPT_RULES_PART_1_CORE
from ._semantic_concept_rules_part1_extended import (
    SEMANTIC_CONCEPT_RULES_PART_1_EXTENDED,
)


SEMANTIC_CONCEPT_RULES_PART_1: tuple[SemanticConceptRule, ...] = (
    *SEMANTIC_CONCEPT_RULES_PART_1_CORE,
    *SEMANTIC_CONCEPT_RULES_PART_1_EXTENDED,
)
