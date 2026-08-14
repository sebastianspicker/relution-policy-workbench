"""Semantic concept rules for certificates, apps, and account controls."""

from .mapping_types_and_constants import SemanticConceptRule
from ._semantic_concept_rules_part2_core import SEMANTIC_CONCEPT_RULES_PART_2_CORE
from ._semantic_concept_rules_part2_extended import (
    SEMANTIC_CONCEPT_RULES_PART_2_EXTENDED,
)


SEMANTIC_CONCEPT_RULES_PART_2: tuple[SemanticConceptRule, ...] = (
    *SEMANTIC_CONCEPT_RULES_PART_2_CORE,
    *SEMANTIC_CONCEPT_RULES_PART_2_EXTENDED,
)
