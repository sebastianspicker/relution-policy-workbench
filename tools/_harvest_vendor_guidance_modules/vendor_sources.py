#!/usr/bin/env python3
"""Harvest vendor guidance into normalized recommendation source catalogs."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from build_relution_import_artifacts import (
    build_source_artifacts,
    manual_promotions_by_recommendation,
    normalize_recommendations,
)
from recommendation_mapping import (
    android_relution_analog_mappings_for as android_relution_analog_mappings_for,
    android_relution_candidates_for as android_relution_candidates_for,
    build_setting_index,
    candidate_from_mapping as candidate_from_mapping,
    load_windows_custom_csp_evidence,
    mapping_candidates as shared_mapping_candidates,
    semantic_candidates_for as semantic_candidates_for,
    semantic_concepts_for as semantic_concepts_for,
)

from _harvest_vendor_guidance_modules.common import (
    REPO_ROOT,
    SAFE_SOURCE_ID_RE as SAFE_SOURCE_ID_RE,
    VENDOR_DIR,
    WINDOWS_WORKBOOK_PATH,
    merge_candidate_lists as merge_candidate_lists,
)
from _harvest_vendor_guidance_modules.vendor_mapping_rules import (
    build_baseline_summary,
    build_windows_recommendation,
    compact_slug as compact_slug,
    read_json,
    relative_output_path as relative_output_path,
    semantic_metadata_for as semantic_metadata_for,
    update_readme,
    vendor_relution_mapping as vendor_relution_mapping,
    vendor_semantic_evidence_sources_for as vendor_semantic_evidence_sources_for,
    workbook_help_by_title,
    write_json,
)
from _harvest_vendor_guidance_modules.vendor_source_content import (
    MAX_VENDOR_DOWNLOAD_BYTES,
    PUBLIC_TOKEN_REDACTIONS,
    TextExtractor,
    download_vendor_source,
    extract_text,
    redact_public_tokens,
)
from _harvest_vendor_guidance_modules.vendor_source_recommendations import (
    build_curated_recommendation,
    build_recommendations as _build_recommendations,
    curated_mapping_context,
    vendor_analog_mappings,
    vendor_exact_mapping,
    vendor_ruleset_mappings,
    vendor_semantic_context,
)
from _harvest_vendor_guidance_modules.vendor_source_refresh import (
    copy_downloads,
    refresh_downloads,
    refresh_vendor_source,
    vendor_source_output_paths,
)
from _harvest_vendor_guidance_modules.vendor_source_safety import (
    resolved_vendor_url_ips,
    safe_vendor_source_id,
    trusted_vendor_source_request,
    validate_vendor_source_url,
    vendor_download_path,
)

__all__ = [
    "CURATED_PLATFORM_GUIDANCE",
    "MAX_VENDOR_DOWNLOAD_BYTES",
    "PUBLIC_TOKEN_REDACTIONS",
    "SAFE_SOURCE_ID_RE",
    "TextExtractor",
    "android_relution_analog_mappings_for",
    "android_relution_candidates_for",
    "build_curated_recommendation",
    "build_recommendations",
    "candidate_from_mapping",
    "compact_slug",
    "copy_downloads",
    "curated_mapping_context",
    "download_vendor_source",
    "extract_text",
    "main",
    "merge_candidate_lists",
    "redact_public_tokens",
    "refresh_downloads",
    "refresh_vendor_source",
    "relative_output_path",
    "resolved_vendor_url_ips",
    "safe_vendor_source_id",
    "semantic_candidates_for",
    "semantic_concepts_for",
    "semantic_metadata_for",
    "shared_mapping_candidates",
    "trusted_vendor_source_request",
    "validate_vendor_source_url",
    "vendor_analog_mappings",
    "vendor_download_path",
    "vendor_exact_mapping",
    "vendor_relution_mapping",
    "vendor_ruleset_mappings",
    "vendor_semantic_context",
    "vendor_semantic_evidence_sources_for",
    "vendor_source_output_paths",
]

sys.dont_write_bytecode = True

WINDOWS_BASELINE_PATH = (
    VENDOR_DIR / "downloads" / "derived" / "windows-25h2-intune-baseline.json"
)
WINDOWS_POLICY_RULES_PATH = (
    VENDOR_DIR / "downloads" / "derived" / "windows-24h2-policy-rules.json"
)
WINDOWS_REXP_EVIDENCE_PATH = (
    VENDOR_DIR / "downloads" / "derived" / "windows-relution-csp-evidence.json"
)

CURATED_PLATFORM_GUIDANCE: list[dict[str, Any]] = [
    {
        "platform": "ANDROID",
        "sourceIds": ["google-play-protect-managed-devices"],
        "title": "Enforce Google Play Protect on managed devices",
        "section": "Malware protection",
        "recommendedValue": "VERIFY_APPS_ENFORCED",
        "reason": (
            "Google documents managed enforcement of Google Play Protect and harmful-app "
            "detection."
        ),
        "reasonSource": "google-play-protect-managed-devices",
        "mapping": (
            "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES",
            {"googlePlayProtectVerifyApps": "VERIFY_APPS_ENFORCED"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Block installation from unknown sources by default",
        "section": "Default security policies",
        "recommendedValue": "DISALLOW_INSTALL",
        "reason": (
            "Google lists blocking installation from unknown sources as a default Android "
            "Enterprise security policy."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": (
            "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES",
            {"untrustedAppsPolicy": "DISALLOW_INSTALL"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Block debugging features by default",
        "section": "Default security policies",
        "recommendedValue": "DEVELOPER_SETTINGS_DISABLED",
        "reason": (
            "Google lists blocked debugging features as a default Android Enterprise "
            "security policy."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": (
            "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES",
            {"developerSettings": "DEVELOPER_SETTINGS_DISABLED"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Disable safe boot by default",
        "section": "Default security policies",
        "recommendedValue": True,
        "reason": "Google lists safe-boot blocking as a default managed-device policy.",
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": ("ANDROID_ENTERPRISE_RESTRICTION", {"safeBootDisabled": True}),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Turn on Verify Apps by default",
        "section": "Verify Apps enforcement",
        "recommendedValue": "VERIFY_APPS_ENFORCED",
        "reason": "Google lists Verify Apps enforcement as a default managed-device policy.",
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": (
            "ANDROID_ENTERPRISE_ADVANCED_SECURITY_OVERRIDES",
            {"googlePlayProtectVerifyApps": "VERIFY_APPS_ENFORCED"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Use compliance enforcement when devices fall out of policy",
        "section": "Compliance enforcement",
        "recommendedValue": "ENFORCE_COMPLIANCE_ACTIONS",
        "reason": (
            "Google describes compliance rules that restrict work-resource access when "
            "managed devices fall out of policy."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-system-updates"],
        "title": "Use compliance policies to keep devices current",
        "section": "System updates",
        "recommendedValue": "COMPLIANCE_POLICIES",
        "reason": (
            "Google recommends compliance policies for keeping managed devices current in "
            "common knowledge-worker deployments."
        ),
        "reasonSource": "google-android-enterprise-system-updates",
    },
    {
        "platform": "ANDROID",
        "sourceIds": [
            "google-android-enterprise-system-updates",
            "google-android-enterprise-feature-list",
        ],
        "title": "Offer automatic OTA system updates",
        "section": "System update policy",
        "recommendedValue": "AUTOMATIC",
        "reason": (
            "Google documents AUTOMATIC as installing system updates as soon as they are "
            "available."
        ),
        "reasonSource": "google-android-enterprise-system-updates",
        "mapping": (
            "ANDROID_ENTERPRISE_SYSTEM_UPDATE",
            {"systemUpdateType": "AUTOMATIC"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": [
            "google-android-enterprise-system-updates",
            "google-android-enterprise-feature-list",
        ],
        "title": "Use a maintenance window for OTA system updates",
        "section": "System update policy",
        "recommendedValue": "WINDOWED",
        "reason": (
            "Google documents WINDOWED as installing system updates during a daily "
            "maintenance window."
        ),
        "reasonSource": "google-android-enterprise-system-updates",
        "mapping": (
            "ANDROID_ENTERPRISE_SYSTEM_UPDATE",
            {"systemUpdateType": "WINDOWED"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": [
            "google-android-enterprise-system-updates",
            "google-android-enterprise-feature-list",
        ],
        "title": "Postpone OTA system updates for up to 30 days",
        "section": "System update policy",
        "recommendedValue": "POSTPONE",
        "reason": "Google documents POSTPONE as delaying system updates for up to 30 days.",
        "reasonSource": "google-android-enterprise-system-updates",
        "mapping": (
            "ANDROID_ENTERPRISE_SYSTEM_UPDATE",
            {"systemUpdateType": "POSTPONE"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": [
            "google-android-enterprise-system-updates",
            "google-android-enterprise-feature-list",
        ],
        "title": "Configure annual freeze periods for update blackout windows",
        "section": "Advanced system update policy",
        "recommendedValue": "FREEZE_PERIODS",
        "reason": (
            "Google documents annual system-update freeze periods for planned blackout "
            "windows."
        ),
        "reasonSource": "google-android-enterprise-system-updates",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Enforce automatic date and time settings",
        "section": "System clock management",
        "recommendedValue": "AUTO_DATE_AND_TIME_ZONE_ENFORCED",
        "reason": (
            "Google documents policy enforcement for automatic date, time, and time-zone "
            "settings."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": (
            "ANDROID_ENTERPRISE_RESTRICTION",
            {"androidAutoDateAndTimeZoneSetting": "AUTO_DATE_AND_TIME_ZONE_ENFORCED"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Require a separate work profile security challenge",
        "section": "Work security challenge",
        "recommendedValue": "REQUIRE_SEPARATE_WORK_LOCK",
        "reason": (
            "Google documents a separate work-profile security challenge for work data "
            "isolation."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": (
            "ANDROID_ENTERPRISE_WORK_PROFILE_PASSCODE",
            {"unifiedLockSettings": "REQUIRE_SEPARATE_WORK_LOCK"},
        ),
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Use a managed device security challenge",
        "section": "Device security challenge",
        "recommendedValue": "PASSWORD_COMPLEXITY_POLICY",
        "reason": (
            "Google documents managed password-complexity policy for device security "
            "challenges."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-management-security-posture"],
        "title": "Wait for HBKA reissuance when posture is unspecified",
        "section": "Security posture",
        "recommendedValue": "RETRY_HBKA",
        "reason": (
            "Google's posture guidance treats unspecified hardware-backed key attestation "
            "as a retryable state."
        ),
        "reasonSource": "google-android-management-security-posture",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-management-security-posture"],
        "title": "Lock the bootloader when unknown OS is reported",
        "section": "Security posture",
        "recommendedValue": "LOCK_BOOTLOADER",
        "reason": (
            "Google's posture guidance calls out locked bootloader state as a security "
            "signal."
        ),
        "reasonSource": "google-android-management-security-posture",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-drop-2025"],
        "title": "Enable Advanced Protection for high-risk users when available",
        "section": "Advanced protection",
        "recommendedValue": "ADVANCED_PROTECTION",
        "reason": (
            "Google documents Android Enterprise Advanced Protection controls for high-risk "
            "users."
        ),
        "reasonSource": "google-android-enterprise-feature-drop-2025",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-drop-2025"],
        "title": "Use APN overrides to restrict traffic to approved networks",
        "section": "Cellular connectivity",
        "recommendedValue": "APN_OVERRIDES",
        "reason": "Google documents APN override management for approved cellular connectivity.",
        "reasonSource": "google-android-enterprise-feature-drop-2025",
    },
    {
        "platform": "ANDROID",
        "sourceIds": ["google-android-enterprise-feature-list"],
        "title": "Install app updates immediately when approved",
        "section": "App update management",
        "recommendedValue": "ALWAYS",
        "reason": (
            "Google documents immediate app auto-update behavior through managed Play "
            "policy."
        ),
        "reasonSource": "google-android-enterprise-feature-list",
        "mapping": (
            "ANDROID_ENTERPRISE_PLAY_STORE_MANAGEMENT",
            {"appAutoUpdatePolicy": "ALWAYS"},
        ),
    },
    {
        "platform": "MACOS",
        "sourceIds": [
            "apple-managing-filevault-macos",
            "apple-manage-filevault-device-management",
        ],
        "title": "Enable FileVault on managed Macs",
        "section": "FileVault",
        "recommendedValue": "ON",
        "reason": (
            "Apple documents FileVault as built-in full-volume encryption for managed Mac "
            "computers."
        ),
        "reasonSource": "apple-managing-filevault-macos",
        "mapping": ("MACOS_FILE_VAULT", {"fdeFileVault": {"enable": "ON"}}),
    },
    {
        "platform": "MACOS",
        "sourceIds": [
            "apple-managing-filevault-macos",
            "apple-manage-filevault-device-management",
        ],
        "title": "Escrow a personal recovery key for FileVault",
        "section": "FileVault",
        "recommendedValue": "PERSONAL_RECOVERY_KEY_ESCROW",
        "reason": "Apple documents device-management escrow of FileVault personal recovery keys.",
        "reasonSource": "apple-managing-filevault-macos",
        "mapping": (
            "MACOS_FILE_VAULT",
            {"enableRecoveryKeyEscrow": True, "fdeFileVault": {"useRecoveryKey": True}},
        ),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-managing-filevault-macos"],
        "title": "Prefer a personal recovery key over an institutional recovery key",
        "section": "FileVault",
        "recommendedValue": "USE_PRK_NOT_IRK",
        "reason": (
            "Apple positions personal recovery keys as the current managed FileVault "
            "recovery-key workflow."
        ),
        "reasonSource": "apple-managing-filevault-macos",
        "mapping": (
            "MACOS_FILE_VAULT",
            {"enableRecoveryKeyEscrow": True, "fdeFileVault": {"useRecoveryKey": True}},
        ),
    },
    {
        "platform": "MACOS",
        "sourceIds": [
            "apple-managing-filevault-macos",
            "apple-manage-filevault-device-management",
        ],
        "title": "Use bootstrap tokens for managed FileVault workflows",
        "section": "FileVault",
        "recommendedValue": "BOOTSTRAP_TOKEN",
        "reason": (
            "Apple documents Bootstrap Token as support for Secure Token and managed "
            "FileVault workflows."
        ),
        "reasonSource": "apple-managing-filevault-macos",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-manage-filevault-device-management"],
        "title": "Require FileVault during Setup Assistant",
        "section": "FileVault",
        "recommendedValue": "FORCE_ENABLE_IN_SETUP_ASSISTANT",
        "reason": (
            "Apple documents FileVault enablement during Setup Assistant for managed Mac "
            "enrollment."
        ),
        "reasonSource": "apple-manage-filevault-device-management",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-gatekeeper-runtime-protection-macos"],
        "title": "Keep Gatekeeper assessment enabled",
        "section": "Gatekeeper",
        "recommendedValue": True,
        "reason": "Apple documents Gatekeeper assessment as a macOS runtime protection.",
        "reasonSource": "apple-gatekeeper-runtime-protection-macos",
        "mapping": ("MACOS_SYSTEM_POLICY_CONTROL", {"enableAssessment": True}),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-gatekeeper-runtime-protection-macos"],
        "title": "Allow only identified developers and notarized apps",
        "section": "Gatekeeper",
        "recommendedValue": True,
        "reason": (
            "Apple documents identified-developer and notarization checks as Gatekeeper "
            "protections."
        ),
        "reasonSource": "apple-gatekeeper-runtime-protection-macos",
        "mapping": ("MACOS_SYSTEM_POLICY_CONTROL", {"allowIdentifiedDevelopers": True}),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-startup-security-macos"],
        "title": "Prefer full security on Apple silicon Macs",
        "section": "Startup security",
        "recommendedValue": "FULL_SECURITY",
        "reason": (
            "Apple documents Full Security as the default startup-security mode for Apple "
            "silicon Macs."
        ),
        "reasonSource": "apple-startup-security-macos",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-startup-security-macos"],
        "title": "Set a Recovery OS password to restrict recovery access",
        "section": "Startup security",
        "recommendedValue": "RECOVERY_LOCK",
        "reason": (
            "Apple documents Recovery Lock for restricting Recovery OS access on Apple "
            "silicon Macs."
        ),
        "reasonSource": "apple-startup-security-macos",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-startup-security-macos"],
        "title": "Use a firmware password on Intel Macs without Apple silicon",
        "section": "Startup security",
        "recommendedValue": "FIRMWARE_PASSWORD",
        "reason": (
            "Apple documents firmware passwords for supported Intel Mac alternate-boot "
            "protection."
        ),
        "reasonSource": "apple-startup-security-macos",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-device-management-deploy-software-updates"],
        "title": "Use software update declarations whenever possible",
        "section": "Software updates",
        "recommendedValue": "DECLARATIVE_DEVICE_MANAGEMENT",
        "reason": (
            "Apple documents software-update declarations as the preferred resilient "
            "update-management model."
        ),
        "reasonSource": "apple-device-management-deploy-software-updates",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-install-enforce-software-updates"],
        "title": "Require a minimum macOS version during Automated Device Enrollment",
        "section": "Software updates",
        "recommendedValue": "MINIMUM_ENROLLMENT_VERSION",
        "reason": "Apple documents minimum OS enforcement during Automated Device Enrollment.",
        "reasonSource": "apple-install-enforce-software-updates",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-install-enforce-software-updates"],
        "title": "Use time-based software update deferrals to phase rollout",
        "section": "Software updates",
        "recommendedValue": "DEFERRALS",
        "reason": "Apple documents time-based software-update deferrals for phased rollout.",
        "reasonSource": "apple-install-enforce-software-updates",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-install-enforce-software-updates"],
        "title": "Turn on automatic software update downloads",
        "section": "Software updates",
        "recommendedValue": "ALWAYS_ON",
        "reason": "Apple documents managed automatic software-update downloads.",
        "reasonSource": "apple-install-enforce-software-updates",
        "mapping": (
            "APPLE_SOFTWARE_UPDATE_SETTINGS",
            {"automaticActions": {"download": "ALWAYS_ON"}},
        ),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-install-enforce-software-updates"],
        "title": "Turn on automatic macOS update installation",
        "section": "Software updates",
        "recommendedValue": "ALWAYS_ON",
        "reason": "Apple documents managed automatic macOS update installation.",
        "reasonSource": "apple-install-enforce-software-updates",
        "mapping": (
            "APPLE_SOFTWARE_UPDATE_SETTINGS",
            {"automaticActions": {"installOSUpdates": "ALWAYS_ON"}},
        ),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-install-enforce-software-updates"],
        "title": "Turn on automatic security update installation",
        "section": "Software updates",
        "recommendedValue": "ALWAYS_ON",
        "reason": (
            "Apple documents automatic security-update installation for XProtect, "
            "Gatekeeper, and system data files."
        ),
        "reasonSource": "apple-install-enforce-software-updates",
        "mapping": (
            "APPLE_SOFTWARE_UPDATE_SETTINGS",
            {"automaticActions": {"installSecurityUpdate": "ALWAYS_ON"}},
        ),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-activation-lock"],
        "title": "Enable Activation Lock for organization-owned Macs",
        "section": "Activation Lock",
        "recommendedValue": True,
        "reason": (
            "Apple documents organization-linked Activation Lock for Apple School Manager "
            "and Apple Business Manager deployments."
        ),
        "reasonSource": "apple-activation-lock",
        "mapping": ("APPLE_DEVICE_SETTINGS", {"allowActivationLock": True}),
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-enforce-password-policies"],
        "title": "Enforce password policies through device management",
        "section": "Password policies",
        "recommendedValue": "MANAGED_PASSWORD_POLICIES",
        "reason": "Apple documents password policies enforced remotely through device management.",
        "reasonSource": "apple-enforce-password-policies",
    },
    {
        "platform": "MACOS",
        "sourceIds": ["apple-managed-device-attestation"],
        "title": "Use Managed Device Attestation for trust evaluation",
        "section": "Managed Device Attestation",
        "recommendedValue": "MANAGED_DEVICE_ATTESTATION",
        "reason": (
            "Apple documents Managed Device Attestation as evidence for device trust "
            "evaluation."
        ),
        "reasonSource": "apple-managed-device-attestation",
    },
]


def build_recommendations(
    field_index: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Build curated Android/macOS and Windows vendor recommendations."""

    return _build_recommendations(
        field_index,
        CURATED_PLATFORM_GUIDANCE,
        WINDOWS_BASELINE_PATH,
        WINDOWS_REXP_EVIDENCE_PATH,
        read_json,
        workbook_help_by_title,
        build_windows_recommendation,
        load_windows_custom_csp_evidence,
    )


def main() -> None:
    """Run the vendor guidance harvester in offline or refresh mode."""
    parser = argparse.ArgumentParser(
        description="Harvest vendor guidance into the repo's normalized recommendation catalog."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--offline",
        action="store_true",
        help="Use the checked-in downloads and derived artifacts.",
    )
    mode.add_argument(
        "--refresh",
        action="store_true",
        help="Download source bodies before rebuilding derived artifacts.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=REPO_ROOT,
        help="Output repository root. Defaults to the current checkout.",
    )
    args = parser.parse_args()

    output_root = args.output_root.resolve()
    output_vendor_dir = output_root / "example" / "vendor-references"
    if args.refresh:
        refresh_downloads(output_vendor_dir)
    elif output_root != REPO_ROOT:
        copy_downloads(output_vendor_dir)

    sources = read_json(VENDOR_DIR / "sources.json")
    field_index = build_setting_index()
    recommendations = normalize_recommendations(
        "vendor",
        build_recommendations(field_index),
        get_promotions=manual_promotions_by_recommendation,
    )
    write_json(output_vendor_dir / "sources.json", sources)
    write_json(
        output_vendor_dir
        / "downloads"
        / "derived"
        / "windows-25h2-intune-baseline.json",
        read_json(WINDOWS_BASELINE_PATH),
    )
    write_json(
        output_vendor_dir / "downloads" / "derived" / "windows-24h2-policy-rules.json",
        read_json(WINDOWS_POLICY_RULES_PATH),
    )
    write_json(
        output_vendor_dir / "downloads" / "derived" / "windows-24h2-workbook.json",
        read_json(WINDOWS_WORKBOOK_PATH),
    )
    write_json(output_vendor_dir / "vendor-recommendations.json", recommendations)
    write_json(
        output_vendor_dir / "vendor-relution-baseline.json",
        build_baseline_summary(sources, recommendations),
    )
    if output_root == REPO_ROOT:
        build_source_artifacts("vendor")
    update_readme(output_vendor_dir, sources, recommendations)
