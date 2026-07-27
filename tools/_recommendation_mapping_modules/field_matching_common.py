"""Shared imports and immutable inputs for recommendation mapping modules."""

import json
import re
from pathlib import Path
from typing import Any
from .mapping_types_and_constants import (
    ALLOW_TERMS,
    BLOCK_STATES,
    CONFIGURED_STATES,
    EXACT_IGNORABLE_TOKENS,
    FieldEntry,
    FieldTokens,
    LOW_SIGNAL_TOKENS,
    NEGATIVE_STATES,
    NEGATIVE_TERMS,
    POSITIVE_STATES,
    ScoredField,
    STOP_WORDS,
    SYNONYMS,
    WINDOWS_POLICY_SIGNATURE_STOP_WORDS,
    WINDOWS_POLICY_SIGNATURE_SYNONYMS,
    unique_preserving_order,
)

__all__ = [
    'ALLOW_TERMS',
    'Any',
    'BLOCK_STATES',
    'CONFIGURED_STATES',
    'EXACT_IGNORABLE_TOKENS',
    'FieldEntry',
    'FieldTokens',
    'LOW_SIGNAL_TOKENS',
    'NEGATIVE_STATES',
    'NEGATIVE_TERMS',
    'POSITIVE_STATES',
    'Path',
    'STOP_WORDS',
    'SYNONYMS',
    'ScoredField',
    'WINDOWS_POLICY_SIGNATURE_STOP_WORDS',
    'WINDOWS_POLICY_SIGNATURE_SYNONYMS',
    'json',
    're',
    'unique_preserving_order'
]
