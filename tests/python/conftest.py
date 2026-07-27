"""Shared pytest cleanup hooks for Python tool tests."""

from pathlib import Path
from shutil import rmtree


def pytest_sessionfinish() -> None:
    """Remove Python bytecode caches created by local pytest runs."""
    root = Path(__file__).resolve().parents[2]
    for path in (root / "tests" / "python", root / "tools"):
        for cache_dir in path.rglob("__pycache__"):
            rmtree(cache_dir)
