"""Shared compatibility bindings for split BSI source modules."""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path

from recommendation_mapping import (
    semantic_candidates_for,
    semantic_concepts_for,
    semantic_metadata_for,
)


def common_legacy_reexports() -> tuple[object, object, object, object, object, object, object]:
    """Return public compatibility symbols used by split BSI modules."""
    return (
        json,
        re,
        zipfile,
        Path,
        semantic_candidates_for,
        semantic_concepts_for,
        semantic_metadata_for,
    )
