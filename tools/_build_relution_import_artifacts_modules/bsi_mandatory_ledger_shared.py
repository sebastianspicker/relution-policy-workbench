"""Build the BSI mandatory mapping ledger from generated setting catalogs."""

from datetime import datetime, timezone
import re
from typing import Any

from .artifact_paths import (
    REPO_ROOT,
)
from .artifact_io import (
    write_json,
)
from .mapping_helpers import (
    exact_mappings,
    mapping_target,
)
from .ruleset_builder import (
    count_by,
)
from recommendation_mapping import (
    unique_preserving_order,
)

BSI_MANDATORY_LEDGER_PATH = (
    REPO_ROOT / "example" / "bsi-references" / "bsi-mandatory-mapping-ledger.json"
)
MANDATORY_MODAL_RE = re.compile(r"\b(MUSS|MÜSSEN|DARF|DÜRFEN)\b", re.IGNORECASE)

__all__ = [
    "datetime", "timezone", "re", "Any", "REPO_ROOT", "write_json", "exact_mappings",
    "mapping_target", "count_by", "unique_preserving_order",
]

