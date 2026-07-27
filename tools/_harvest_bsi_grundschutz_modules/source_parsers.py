#!/usr/bin/env python3
"""Compatibility facade for BSI DocBook, checklist, and catalog parsers."""

from .bsi_source_core import *  # noqa: F401,F403
from .bsi_source_text import *  # noqa: F401,F403
from .bsi_docbook_sections import *  # noqa: F401,F403
from .bsi_docbook_identifiers import *  # noqa: F401,F403
from .bsi_docbook_requirements import *  # noqa: F401,F403
from .bsi_docbook_catalog import *  # noqa: F401,F403
from .bsi_checklist_parser import *  # noqa: F401,F403
from .bsi_oscal_properties import *  # noqa: F401,F403
from .bsi_source_collections import *  # noqa: F401,F403

__all__ = [name for name in globals() if not name.startswith("_")]
