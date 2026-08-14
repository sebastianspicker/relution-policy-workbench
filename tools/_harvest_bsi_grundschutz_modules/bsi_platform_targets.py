"""Compatibility facade for BSI platform target catalog seams."""

from .bsi_platform_baselines import PLATFORM_TARGETS
from .bsi_platform_mapping_rules import MAPPING_RULES
from .bsi_platform_models import ModuleTarget, PlatformTarget
from .bsi_plusplus_platform_context import (
    GS_PLUSPLUS_METHOD_CONTEXT,
    GS_PLUSPLUS_RELATED_CONTROL_RULES,
    GS_PLUSPLUS_STOPWORDS,
    PLATFORM_GS_PLUSPLUS_TARGET_CATEGORIES,
)


__all__ = [
    "GS_PLUSPLUS_METHOD_CONTEXT",
    "GS_PLUSPLUS_RELATED_CONTROL_RULES",
    "GS_PLUSPLUS_STOPWORDS",
    "MAPPING_RULES",
    "ModuleTarget",
    "PLATFORM_GS_PLUSPLUS_TARGET_CATEGORIES",
    "PLATFORM_TARGETS",
    "PlatformTarget",
]
