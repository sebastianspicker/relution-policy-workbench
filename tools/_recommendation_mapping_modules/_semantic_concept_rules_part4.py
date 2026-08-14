"""Semantic concept rules for governance, data flow, and platform hardening."""

from .mapping_types_and_constants import SemanticConceptRule
from ._semantic_concept_rules_part4_data_governance import (
    SEMANTIC_CONCEPT_RULES_PART_4_DATA_GOVERNANCE,
)
from ._semantic_concept_rules_part4_lifecycle import (
    SEMANTIC_CONCEPT_RULES_PART_4_LIFECYCLE,
)
from ._semantic_concept_rules_part4_strategy import (
    SEMANTIC_CONCEPT_RULES_PART_4_STRATEGY,
)


SEMANTIC_CONCEPT_RULES_PART_4: tuple[SemanticConceptRule, ...] = (
    *SEMANTIC_CONCEPT_RULES_PART_4_DATA_GOVERNANCE,
    *SEMANTIC_CONCEPT_RULES_PART_4_STRATEGY,
    *SEMANTIC_CONCEPT_RULES_PART_4_LIFECYCLE,
)
