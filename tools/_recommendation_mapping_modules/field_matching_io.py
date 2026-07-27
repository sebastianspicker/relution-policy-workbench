"""Io helpers for recommendation mapping."""

from .field_matching_common import (
    Any,
    Path,
    json,
)

def read_json(path: Path) -> Any:
    """Read a UTF-8 JSON artifact from disk."""

    return json.loads(path.read_text(encoding="utf8"))
