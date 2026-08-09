"""Tests for parsing individual BSI checklist workbooks."""

import importlib
from pathlib import Path

from python_tool_helpers import expect


checklist_workbooks = importlib.import_module(
    "_harvest_bsi_grundschutz_modules.bsi_checklist_workbooks"
)
parse_individual_checklist_workbooks = (
    checklist_workbooks.parse_individual_checklist_workbooks
)


def test_parse_checklists_normalizes_and_filters_requirement_rows(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Keep same-module requirements and let the later duplicate win."""
    workbook = tmp_path / "Checkliste_SYS.xlsx"
    workbook.touch()
    monkeypatch.setattr(
        checklist_workbooks,
        "read_xlsx_rows",
        lambda path: {
            "  SYS.1.1  ": [
                {2: "  Baustein:  System   Service  "},
                {2: " Kompendium:   2023  "},
                {2: "ID-Anforderung"},
                {
                    2: " SYS.1.1.A1 ",
                    3: " First\n title ",
                    4: " First\t text ",
                    5: "  type  ",
                },
                {2: "SYS.1.2.A2", 3: "Other module"},
                {
                    2: " SYS.1.1.A1 ",
                    3: " Replacement  title ",
                    4: " Replacement\ntext ",
                    5: " replacement  type ",
                },
            ]
        },
    )
    monkeypatch.setattr(
        checklist_workbooks, "relative_repo_path", lambda path: f"sources/{path.name}"
    )

    checklists = parse_individual_checklist_workbooks(tmp_path)

    checklist = checklists["SYS.1.1"]
    expect(checklist["moduleId"] == "SYS.1.1")
    expect(checklist["moduleTitle"] == "System Service")
    expect(checklist["edition"] == "2023")
    expect(checklist["sourcePath"] == "sources/Checkliste_SYS.xlsx")
    expect(checklist["sheetName"] == "  SYS.1.1  ")
    expect(
        checklist["requirements"]
        == {
            "SYS.1.1.A1": {
                "requirementId": "SYS.1.1.A1",
                "title": "Replacement title",
                "text": "Replacement text",
                "type": "replacement type",
            }
        }
    )


def test_parse_checklists_stops_metadata_at_header_and_handles_missing_headers(
    tmp_path: Path, monkeypatch: object
) -> None:
    """Traverse workbooks in order while preserving header and sheet semantics."""
    first = tmp_path / "Checkliste_A.xlsx"
    second = tmp_path / "Checkliste_Z.xlsx"
    first.touch()
    second.touch()
    read_paths: list[Path] = []

    def rows_for(path: Path) -> dict[str, list[dict[int, str]]]:
        read_paths.append(path)
        if path == first:
            return {
                "   ": [{2: "ID-Anforderung"}],
                " MOD.A ": [
                    {2: "MOD.A.A1", 3: "Ignored without header"},
                ],
            }
        return {
            "MOD.Z": [
                {2: "Baustein: Original title"},
                {2: "Kompendium: Original edition"},
                {2: "ID-Anforderung"},
                {2: "Baustein: Later title"},
                {2: "Kompendium: Later edition"},
                {2: "MOD.Z.A1", 3: "Retained"},
            ]
        }

    monkeypatch.setattr(checklist_workbooks, "read_xlsx_rows", rows_for)
    monkeypatch.setattr(
        checklist_workbooks, "relative_repo_path", lambda path: path.name
    )

    checklists = parse_individual_checklist_workbooks(tmp_path)

    expect(read_paths == [first, second])
    expect(list(checklists) == ["MOD.A", "MOD.Z"])
    expect(checklists["MOD.A"]["moduleTitle"] == "MOD.A")
    expect(checklists["MOD.A"]["requirements"] == {})
    expect(checklists["MOD.Z"]["moduleTitle"] == "Original title")
    expect(checklists["MOD.Z"]["edition"] == "Original edition")
    expect(checklists["MOD.Z"]["requirements"]["MOD.Z.A1"]["title"] == "Retained")
