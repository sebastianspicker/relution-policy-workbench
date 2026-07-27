"""Generated Relution baseline harvesting for policy comparisons."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from _build_relution_import_artifacts_modules.artifact_io import flatten_values
from _compare_institution_policy_baseline_constants import REPO_ROOT
from _compare_institution_policy_baseline_summary import summarize_by_platform
from _compare_institution_policy_baseline_utils import path_to_string, read_json


def harvest_relution_baseline_index(index_path: Path) -> dict[str, Any]:
    """Build a normalized index of actionable generated baseline targets."""

    template_index = read_json(index_path)
    actionable_targets = []
    suppressed_conflicts = []
    for entry in template_index["consolidatedTemplates"]:
        ruleset = read_json(REPO_ROOT / entry["path"])
        platform = entry["platform"]
        for policy in ruleset.get("policies", []):
            for rule in policy.get("rules", []):
                if rule.get("conflict") is not None:
                    suppressed_conflicts.append(
                        {"platform": platform, **rule["conflict"]}
                    )
                if not is_actionable(rule):
                    continue
                for mapping in rule.get("mappings", []):
                    target = mapping_target(mapping)
                    if target is None:
                        continue
                    actionable_targets.append(
                        {
                            "platform": platform,
                            "ruleId": rule["id"],
                            "title": rule["title"],
                            "kind": mapping.get("kind"),
                            "target": target,
                            "targetName": mapping.get("values", {}).get("name")
                            if isinstance(mapping.get("values"), dict)
                            else None,
                            "fieldPaths": sorted(
                                path_to_string(path)
                                for path in flatten_values(mapping.get("values", {}))
                            ),
                            "values": mapping.get("values", {}),
                            "sources": sorted(
                                {
                                    source_rule.get("source")
                                    for source_rule in rule.get("sourceRules", [])
                                    if source_rule.get("source")
                                }
                            ),
                            "sourceRules": rule.get("sourceRules", []),
                        }
                    )
    return {
        "version": 1,
        "name": "Generated Relution Baseline Index",
        "baselineTemplateIndexPath": index_path.relative_to(REPO_ROOT).as_posix(),
        "generatedAt": template_index.get("generatedAt"),
        "actionableTargets": actionable_targets,
        "suppressedConflicts": suppressed_conflicts,
        "summary": summarize_by_platform(actionable_targets),
    }


def is_actionable(rule: dict[str, Any]) -> bool:
    """Return true for baseline rules that carry concrete mappings."""

    return (
        rule.get("informational") is not True
        and isinstance(rule.get("mappings"), list)
        and len(rule["mappings"]) > 0
    )


def mapping_target(mapping: dict[str, Any]) -> str | None:
    """Return the target identifier from any supported mapping shape."""

    for key in ("type", "payloadType", "schemaId"):
        if isinstance(mapping.get(key), str):
            return mapping[key]
    return None
