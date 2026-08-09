"""Focused contracts for the guideline mapping update command."""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

import pytest

from python_tool_helpers import expect


contracts = importlib.import_module("_guideline_mapping_update_modules.contracts")
workflow = importlib.import_module("_guideline_mapping_update_modules.workflow")
cli = importlib.import_module("_guideline_mapping_update_modules.cli")


def test_parser_preserves_sources_and_mutually_exclusive_modes() -> None:
    """Keep the source selection and mode parser contract stable."""

    parser = cli.build_parser()
    args = parser.parse_args(["--source", "vendor", "--offline"])

    expect(args.source == "vendor")
    expect(args.offline is True)
    expect(args.refresh is False)
    expect("Refresh or rebuild guideline mapping drift artifacts." in parser.format_help())
    with pytest.raises(SystemExit):
        parser.parse_args(["--source", "unknown"])
    with pytest.raises(SystemExit):
        parser.parse_args(["--offline", "--refresh"])


def test_source_commands_and_build_arguments_preserve_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Execute checked-in harvesters and the builder in the selected order."""

    calls: list[tuple[str, tuple[str, ...]]] = []
    monkeypatch.setattr(
        workflow,
        "run_repo_python_tool",
        lambda script, *args: calls.append((script, args)),
    )

    sources = contracts.selected_sources("all")
    workflow.rebuild_sources_offline(sources)
    workflow.run_build_relution_import_artifacts(sources)

    expect(
        calls
        == [
            ("tools/harvest_bsi_grundschutz.py", ()),
            ("tools/harvest_cis_benchmarks.py", ()),
            ("tools/harvest_vendor_guidance.py", ("--offline",)),
            ("tools/build_relution_import_artifacts.py", ("bsi", "cis", "vendor")),
        ]
    )


def test_refresh_fails_closed_before_running_bsi_or_cis(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject unsupported online refreshes without partial work."""

    calls: list[tuple[str, tuple[str, ...]]] = []
    monkeypatch.setattr(
        workflow,
        "run_repo_python_tool",
        lambda script, *args: calls.append((script, args)),
    )

    with pytest.raises(SystemExit, match="only for vendor guidance"):
        workflow.refresh_sources(["vendor", "cis"])

    expect(not calls)


def test_run_repo_python_tool_restores_cwd_and_argv_after_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Restore process state even when an invoked script raises."""

    initial_argv = ["pytest", "-q"]
    observed: dict[str, Any] = {}
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(sys, "argv", initial_argv[:])

    def raise_from_script(path: str, run_name: str) -> None:
        observed["path"] = path
        observed["run_name"] = run_name
        observed["cwd"] = Path.cwd()
        observed["argv"] = sys.argv[:]
        raise RuntimeError("expected script failure")

    monkeypatch.setattr(workflow.runpy, "run_path", raise_from_script)

    with pytest.raises(RuntimeError, match="expected script failure"):
        workflow.run_repo_python_tool("tools/example.py", "--check")

    expect(observed["path"] == str(contracts.REPO_ROOT / "tools/example.py"))
    expect(observed["run_name"] == "__main__")
    expect(observed["cwd"] == contracts.REPO_ROOT)
    expect(observed["argv"] == ["tools/example.py", "--check"])
    expect(Path.cwd() == tmp_path)
    expect(sys.argv == initial_argv)


def test_main_prints_verified_outputs_in_contract_order(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Retain the established output-path order after successful orchestration."""

    calls: list[tuple[str, list[str]]] = []
    monkeypatch.setattr(sys, "argv", ["update_guideline_mappings.py", "--source", "cis"])
    monkeypatch.setattr(
        cli, "rebuild_sources_offline", lambda sources: calls.append(("offline", sources))
    )
    monkeypatch.setattr(
        cli,
        "run_build_relution_import_artifacts",
        lambda sources: calls.append(("build", sources)),
    )
    monkeypatch.setattr(cli, "verify_expected_outputs", lambda: calls.append(("verify", [])))

    cli.main()

    expect(calls == [("offline", ["cis"]), ("build", ["cis"]), ("verify", [])])
    expected_output = "".join(
        f"Wrote {path.relative_to(contracts.REPO_ROOT)}\n"
        for path in contracts.EXPECTED_UPDATE_ARTIFACT_PATHS
    )
    expect(capsys.readouterr().out == expected_output)
