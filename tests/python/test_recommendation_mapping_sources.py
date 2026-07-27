"""Tests for recommendation-mapping source discovery and safety."""

from pathlib import Path

from python_tool_helpers import TOOLS_DIR, expect, import_tool


vendor_sources_module = import_tool("_harvest_vendor_guidance_modules.vendor_sources")
bsi_module = import_tool("harvest_bsi_grundschutz")
cis_module = import_tool("harvest_cis_benchmarks")

safe_vendor_source_id = vendor_sources_module.safe_vendor_source_id
validate_vendor_source_url = vendor_sources_module.validate_vendor_source_url
vendor_download_path = vendor_sources_module.vendor_download_path
BSI_ERRATA_TEXT_PATH = bsi_module.ERRATA_TEXT_PATH
BSI_GS_PLUSPLUS_CATALOG_PATH = bsi_module.GS_PLUSPLUS_CATALOG_PATH
BSI_GS_PLUSPLUS_METHOD_PATH = bsi_module.GS_PLUSPLUS_METHOD_PATH
BSI_INDIVIDUAL_CHECKLISTS_DIR = bsi_module.INDIVIDUAL_CHECKLISTS_DIR
BSI_XML_PATH = bsi_module.XML_PATH
BSI_XLSX_PATH = bsi_module.XLSX_PATH
bsi_harvest_main = bsi_module.main
CIS_BENCHMARKS = cis_module.BENCHMARKS
CIS_MANIFEST_PATH = cis_module.MANIFEST_PATH
CIS_PDF_DIR = cis_module.PDF_DIR
CIS_SOURCES_PATH = cis_module.SOURCES_PATH
cis_harvest_main = cis_module.main


def test_vendor_source_ids_and_urls_reject_local_path_inputs(tmp_path: Path) -> None:
    """Reject vendor source identifiers and URLs that could read local files."""
    expect(
        safe_vendor_source_id("microsoft-windows-11-baseline")
        == "microsoft-windows-11-baseline"
    )
    try:
        safe_vendor_source_id("../escape")
    except ValueError as error:
        expect("Unsafe vendor source id" in str(error))
    else:
        raise AssertionError("unsafe vendor source id was accepted")

    for url in ("file:///etc/passwd", "http://127.0.0.1/source.html"):
        try:
            validate_vendor_source_url(url)
        except ValueError:
            pass
        else:
            raise AssertionError(f"unsafe vendor source URL was accepted: {url}")

    try:
        vendor_download_path(tmp_path, "raw", "../../escape.html")
    except ValueError as error:
        expect("escapes output directory" in str(error))
    else:
        raise AssertionError("escaping vendor download path was accepted")


def test_vendor_json_writer_creates_missing_parent_directories(tmp_path: Path) -> None:
    """Preserve vendor artifact writes into newly created output trees."""
    output = tmp_path / "nested" / "vendor.json"

    vendor_sources_module.write_json(output, {"ok": True})

    expect(output.read_text(encoding="utf8") == '{\n  "ok": true\n}\n')


def test_bsi_generator_smoke_discovers_required_source_files() -> None:
    """Document which BSI source files are optional/missing in the test checkout."""
    expect(callable(bsi_harvest_main))
    required_sources = {
        "kompendium_xml": BSI_XML_PATH,
        "checklist_workbook": BSI_XLSX_PATH,
        "individual_checklists": BSI_INDIVIDUAL_CHECKLISTS_DIR,
        "errata_text": BSI_ERRATA_TEXT_PATH,
        "grundschutz_plusplus_catalog": BSI_GS_PLUSPLUS_CATALOG_PATH,
        "grundschutz_plusplus_method_pdf": BSI_GS_PLUSPLUS_METHOD_PATH,
    }
    expected_root = TOOLS_DIR.parent / "example" / "bsi-references"
    expect(all(expected_root in path.parents for path in required_sources.values()))
    expect(required_sources["grundschutz_plusplus_catalog"].is_file())

    missing_sources = {
        label for label, path in required_sources.items() if not path.exists()
    }
    expect(
        missing_sources
        == {
            "kompendium_xml",
            "checklist_workbook",
            "individual_checklists",
            "errata_text",
            "grundschutz_plusplus_method_pdf",
        }
    )


def test_cis_generator_smoke_discovers_required_source_files() -> None:
    """Accept a complete ignored PDF cache or a clean checkout with no PDFs."""
    expect(callable(cis_harvest_main))
    expect(CIS_SOURCES_PATH.is_file())
    expect(CIS_MANIFEST_PATH.is_file())
    expect(len(CIS_BENCHMARKS) > 0)
    expect(all(benchmark.path.parent == CIS_PDF_DIR for benchmark in CIS_BENCHMARKS))

    missing_pdfs = [
        benchmark.file_name
        for benchmark in CIS_BENCHMARKS
        if not benchmark.path.exists()
    ]
    expect(len(missing_pdfs) in {0, len(CIS_BENCHMARKS)})
