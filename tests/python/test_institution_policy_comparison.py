"""Tests for institution policy comparison helper behavior."""

from pathlib import Path

from python_tool_helpers import expect, import_tool


comparison_module = import_tool("compare_institution_policy_baseline")
baseline_target_matches_policy = comparison_module.baseline_target_matches_policy
compare_indexes = comparison_module.compare_indexes
harvest_policy_file = comparison_module.harvest_policy_file
harvest_relution_baseline_index = comparison_module.harvest_relution_baseline_index
read_json = comparison_module.read_json
write_outputs = comparison_module.write_outputs


REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = REPO_ROOT / "example" / "institution-policy-comparison"


def test_harvest_relution_baseline_index_keeps_conflicts_before_filtering(
    monkeypatch,
) -> None:
    """Keep non-actionable conflicts while skipping mappings without targets."""

    baseline_module = __import__(
        "_compare_institution_policy_baseline_baseline",
        fromlist=["harvest_relution_baseline_index"],
    )
    index_path = REPO_ROOT / "synthetic-relution-baseline-index.json"
    ios_ruleset_path = REPO_ROOT / "synthetic-ios-ruleset.json"
    windows_ruleset_path = REPO_ROOT / "synthetic-windows-ruleset.json"
    payloads = {
        index_path: {
            "generatedAt": "2026-08-05T00:00:00Z",
            "consolidatedTemplates": [
                {
                    "platform": "IOS",
                    "path": ios_ruleset_path.relative_to(REPO_ROOT).as_posix(),
                },
                {
                    "platform": "WINDOWS",
                    "path": windows_ruleset_path.relative_to(REPO_ROOT).as_posix(),
                },
            ],
        },
        ios_ruleset_path: {
            "policies": [
                {
                    "rules": [
                        {
                            "id": "ios-conflicted-information",
                            "title": "Conflicted informational rule",
                            "informational": True,
                            "conflict": {
                                "ruleId": "ios-conflicted-information",
                                "reason": "informational conflict",
                            },
                            "mappings": [{"type": "IOS_IGNORED"}],
                        },
                        {
                            "id": "ios-missing-target",
                            "title": "Missing target",
                            "mappings": [
                                {
                                    "kind": "relution-native",
                                    "values": {"name": "Ignored mapping"},
                                }
                            ],
                        },
                        {
                            "id": "ios-mapped",
                            "title": "Mapped iOS rule",
                            "mappings": [
                                {
                                    "kind": "relution-native",
                                    "schemaId": "IOS_RESTRICTION",
                                    "values": {
                                        "name": "iOS restriction",
                                        "nested": {"z": 1, "a": True},
                                    },
                                }
                            ],
                            "sourceRules": [
                                {"source": "bsi", "ruleId": "bsi-1"},
                                {"source": "cis", "ruleId": "cis-1"},
                                {"source": "bsi", "ruleId": "bsi-2"},
                            ],
                        },
                    ]
                }
            ]
        },
        windows_ruleset_path: {
            "policies": [
                {
                    "rules": [
                        {
                            "id": "windows-mapped",
                            "title": "Mapped Windows rule",
                            "mappings": [
                                {
                                    "kind": "relution-native",
                                    "type": "WINDOWS_UPDATE",
                                    "values": {"enabled": False},
                                }
                            ],
                        }
                    ]
                }
            ]
        },
    }
    monkeypatch.setattr(baseline_module, "read_json", payloads.__getitem__)

    index = harvest_relution_baseline_index(index_path)

    expect(
        index
        == {
            "version": 1,
            "name": "Generated Relution Baseline Index",
            "baselineTemplateIndexPath": "synthetic-relution-baseline-index.json",
            "generatedAt": "2026-08-05T00:00:00Z",
            "actionableTargets": [
                {
                    "platform": "IOS",
                    "ruleId": "ios-mapped",
                    "title": "Mapped iOS rule",
                    "kind": "relution-native",
                    "target": "IOS_RESTRICTION",
                    "targetName": "iOS restriction",
                    "fieldPaths": ["name", "nested.a", "nested.z"],
                    "values": {
                        "name": "iOS restriction",
                        "nested": {"z": 1, "a": True},
                    },
                    "sources": ["bsi", "cis"],
                    "sourceRules": [
                        {"source": "bsi", "ruleId": "bsi-1"},
                        {"source": "cis", "ruleId": "cis-1"},
                        {"source": "bsi", "ruleId": "bsi-2"},
                    ],
                },
                {
                    "platform": "WINDOWS",
                    "ruleId": "windows-mapped",
                    "title": "Mapped Windows rule",
                    "kind": "relution-native",
                    "target": "WINDOWS_UPDATE",
                    "targetName": None,
                    "fieldPaths": ["enabled"],
                    "values": {"enabled": False},
                    "sources": [],
                    "sourceRules": [],
                },
            ],
            "suppressedConflicts": [
                {
                    "platform": "IOS",
                    "ruleId": "ios-conflicted-information",
                    "reason": "informational conflict",
                }
            ],
            "summary": {
                "total": 2,
                "byPlatform": {"IOS": 1, "WINDOWS": 1},
            },
        }
    )


def test_institution_policy_file_harvest_extracts_policy_metadata(
    tmp_path: Path,
) -> None:
    """Verify policy Markdown harvesting extracts metadata and target settings."""

    institution_root = tmp_path / "sample_policy_docs"
    policy_path = (
        institution_root
        / "docs/managed-devices/05-policies-catalog/windows-policies.md"
    )
    policy_path.parent.mkdir(parents=True)
    policy_path.write_text(
        "\n".join(
            [
                "## Windows",
                "### WIN-TEST-010 - BitLocker und Kennwort",
                "",
                "Policy: `Institution Windows Security Baseline`",
                "",
                "| Setting | Value |",
                "| --- | --- |",
                "| Minimum password length | **12** |",
                "",
                "BitLocker und sichere Kennwortauthentisierung muessen aktiviert sein.",
                "",
                "Controls-Mapping: SYS.3.2.2.A23, MDM.2.2.06",
                "",
                "#### Verifikation",
                "",
                "Diese Sektion darf nicht in den Match-Text fallen: AuditCredentialValidation.",
            ]
        ),
        encoding="utf8",
    )

    policies = harvest_policy_file("WINDOWS", policy_path, institution_root)

    expect(len(policies) == 1)
    policy = policies[0]
    expect(policy["id"] == "WIN-TEST-010")
    expect(
        policy["sourcePath"]
        == "docs/managed-devices/05-policies-catalog/windows-policies.md"
    )
    expect("WINDOWS_BITLOCKER" in policy["relutionTargets"])
    expect("WINDOWS_PASSCODE" in policy["relutionTargets"])
    expect(policy["settings"]["WINDOWS_PASSCODE"]["minLength"] == 12)
    expect("AuditCredentialValidation".lower() not in policy["matchText"])


def test_windows_custom_csp_matching_requires_specific_identifier_overlap() -> None:
    """Verify Windows CSP matching requires specific policy term overlap."""

    laps_policy = {
        "relutionTargets": ["WINDOWS_CUSTOM_CSP", "WINDOWS_PASSCODE"],
        "matchTerms": ["laps", "backup", "directory", "administrator", "password"],
    }
    vbs_policy = {
        "relutionTargets": ["WINDOWS_CUSTOM_CSP"],
        "matchTerms": ["virtualization", "hypervisor", "code", "integrity"],
    }

    expect(
        baseline_target_matches_policy(
            laps_policy,
            {
                "target": "WINDOWS_CUSTOM_CSP",
                "targetName": "BackupDirectory (Disabled -> Error)",
            },
        )
    )
    expect(
        baseline_target_matches_policy(
            vbs_policy,
            {
                "target": "WINDOWS_CUSTOM_CSP",
                "targetName": "HypervisorEnforcedCodeIntegrity",
            },
        )
    )
    expect(
        not baseline_target_matches_policy(
            laps_policy,
            {
                "target": "WINDOWS_CUSTOM_CSP",
                "targetName": "AccountLogon_AuditCredentialValidation",
            },
        )
    )


def test_compare_indexes_reports_institution_only_and_missing_baseline_targets() -> (
    None
):
    """Verify index comparison reports institution-only and missing baseline rows."""

    institution_index = {
        "policies": [
            {
                "id": "WIN-TEST-010",
                "platform": "WINDOWS",
                "title": "WIN-TEST-010 - Process only",
                "relutionTargets": [],
                "controls": [],
                "settings": {},
                "sourcePath": "windows.md",
                "lineStart": 1,
                "lineEnd": 10,
            }
        ]
    }
    baseline_index = {
        "generatedAt": "2026-04-24T20:01:33Z",
        "actionableTargets": [
            {
                "platform": "WINDOWS",
                "ruleId": "baseline-windows-update",
                "target": "WINDOWS_UPDATE",
                "targetName": None,
                "title": "Windows Update",
                "values": {},
            }
        ],
        "suppressedConflicts": [],
    }

    comparison = compare_indexes(institution_index, baseline_index)

    expect(comparison["summary"]["statusCounts"] == {"institution-only": 1})
    expect(comparison["summary"]["baselineMissingInInstitution"] == 1)
    expect(
        comparison["baselineMissingInInstitution"][0]["ruleId"]
        == "baseline-windows-update"
    )


def test_write_outputs_creates_json_and_markdown_reports(tmp_path: Path) -> None:
    """Verify comparison outputs include JSON indexes and Markdown summary."""

    institution_index = {"policies": [], "summary": {"total": 0, "byPlatform": {}}}
    baseline_index = {
        "actionableTargets": [],
        "suppressedConflicts": [],
        "summary": {"total": 0, "byPlatform": {}},
    }
    comparison = {
        "generatedAt": "2026-04-24T20:01:33Z",
        "policyResults": [],
        "baselineMissingInInstitution": [],
        "summary": {
            "institutionPolicies": 0,
            "baselineActionableTargets": 0,
            "baselineMissingInInstitution": 0,
            "statusCounts": {},
        },
    }

    write_outputs(tmp_path, institution_index, baseline_index, comparison)

    expect((tmp_path / "institution-policy-index.json").exists())
    expect((tmp_path / "relution-baseline-index.json").exists())
    expect((tmp_path / "institution-vs-relution-baseline.json").exists())
    expect(
        (tmp_path / "institution-vs-relution-baseline.md")
        .read_text(encoding="utf8")
        .startswith("# Institution Policy Catalog vs Generated Relution Baseline")
    )


def test_generated_institution_comparison_artifacts_are_consistent() -> None:
    """Verify checked-in comparison artifacts remain internally consistent."""

    institution_index = read_json(OUTPUT_ROOT / "institution-policy-index.json")
    baseline_index = read_json(OUTPUT_ROOT / "relution-baseline-index.json")
    comparison = read_json(OUTPUT_ROOT / "institution-vs-relution-baseline.json")

    expect(len(institution_index["policies"]) == 1)
    expect(len(baseline_index["actionableTargets"]) == 183)
    expect(
        comparison["summary"]["institutionPolicies"]
        == len(institution_index["policies"])
    )
    expect(
        comparison["summary"]["baselineActionableTargets"]
        == len(baseline_index["actionableTargets"])
    )
    expect(
        comparison["summary"]["baselineMissingInInstitution"]
        == len(comparison["baselineMissingInInstitution"])
    )
    expect(
        {"docs/managed-devices/05-policies-catalog/windows-policies.md"}
        == {policy["sourcePath"] for policy in institution_index["policies"]}
    )
    expect(
        set(comparison["summary"]["statusCounts"])
        <= {"conflict", "covered", "documented-only", "institution-only"}
    )
