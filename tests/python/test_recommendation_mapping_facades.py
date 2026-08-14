"""Characterize recommendation-mapping facades and catalog ordering."""

import importlib

from python_tool_helpers import evidence, expect, import_tool


recommendation_mapping = import_tool("recommendation_mapping")
mapping_constants = importlib.import_module(
    "_recommendation_mapping_modules.mapping_types_and_constants"
)
semantic_rules = importlib.import_module(
    "_recommendation_mapping_modules.semantic_concept_rules"
)


def test_public_recommendation_mapping_facade_exports_remain_available() -> None:
    """Keep the script facade's supported names and ordering stable."""
    expected_exports = [
        "MANAGEMENT_SUPPORT_CONCEPT_IDS",
        "android_relution_analog_mappings_for",
        "android_relution_candidates_for",
        "apple_mobileconfig_candidates_for",
        "apple_schema_analog_mappings_for",
        "build_setting_index",
        "candidate_from_mapping",
        "flatten_value_paths",
        "infer_exact_boolean_mapping",
        "load_apple_mobileconfig_evidence",
        "load_windows_custom_csp_evidence",
        "mapping_candidates",
        "merge_candidate_lists",
        "semantic_candidates_for",
        "semantic_concepts_for",
        "semantic_concepts_for_field",
        "semantic_evidence_source_records",
        "semantic_metadata_for",
        "semantic_no_concept_reason",
        "split_identifier",
        "tokenize",
        "windows_custom_csp_mapping_for",
    ]

    expect(recommendation_mapping.__all__ == expected_exports)
    expect(all(hasattr(recommendation_mapping, name) for name in expected_exports))


def test_mapping_constants_facade_keeps_models_catalogs_and_metadata() -> None:
    """Keep compatibility imports stable after the implementation is partitioned."""
    expected_names = {
        "ALLOW_TERMS",
        "ANDROID_ADVANCED_SECURITY",
        "ANDROID_DISPLAY",
        "ANDROID_KEYGUARD",
        "ANDROID_LOCATION",
        "ANDROID_PLAY_STORE",
        "ANDROID_RESTRICTION",
        "ANDROID_SYSTEM_UPDATE",
        "APPLE_ANALOG_RULES",
        "APPLE_APPLICATION_ACCESS",
        "APPLE_MCX_ACCOUNTS",
        "APPLE_MOBILECONFIG_CANDIDATE_RULES",
        "APPLE_MOBILECONFIG_EVIDENCE_PATH",
        "APPLE_PASSCODE",
        "APPLE_SCHEMA_CATALOG_PATH",
        "APPLE_SCREEN_SAVER",
        "APPLE_SOFTWARE_UPDATE",
        "AndroidAnalogRule",
        "AppleAnalogRule",
        "BSI_CONCEPT_MATCH_REASON",
        "BLOCK_STATES",
        "CONFIGURED_STATES",
        "DIRECT_SEMANTIC_SOURCES",
        "EXACT_IGNORABLE_TOKENS",
        "FieldEntry",
        "FieldTokens",
        "GS_PLUSPLUS_SEMANTIC_SOURCES",
        "LOW_SIGNAL_TOKENS",
        "MANAGEMENT_SUPPORT_CONCEPT_IDS",
        "NEGATIVE_STATES",
        "NEGATIVE_TERMS",
        "POSITIVE_STATES",
        "PROCESS_ONLY_TITLE_TERMS",
        "RELATED_SEMANTIC_SOURCES",
        "REPO_ROOT",
        "ScoredField",
        "SemanticConceptRule",
        "SemanticConceptTarget",
        "STOP_WORDS",
        "SYNONYMS",
        "TEMPLATE_BUNDLE_PATH",
        "WINDOWS_POLICY_SIGNATURE_STOP_WORDS",
        "WINDOWS_POLICY_SIGNATURE_SYNONYMS",
        "semantic_target",
        "unique_preserving_order",
    }

    expect(all(hasattr(mapping_constants, name) for name in expected_names))
    expect(len(mapping_constants.APPLE_ANALOG_RULES) == 45)
    expect(len(mapping_constants.APPLE_MOBILECONFIG_CANDIDATE_RULES) == 7)


def test_semantic_rule_order_and_representative_mappings_remain_stable() -> None:
    """Preserve rule priority and representative Apple mapping behavior."""
    expected_concept_ids = [
        "passcode_authentication",
        "mfa",
        "lock_idle",
        "encryption",
        "updates",
        "malware_protection",
        "firewall",
        "network_connectivity",
        "dns_resolution",
        "certificates",
        "app_allowlist",
        "permissions_privacy",
        "cloud_sync",
        "telemetry",
        "lock_screen_message",
        "time_sync",
        "exploit_mitigation",
        "device_attestation_posture",
        "camera_microphone",
        "location",
        "security_critical_functions",
        "remote_lock_wipe",
        "logging_compliance",
        "inventory",
        "browser_restrictions",
        "external_media",
        "kiosk",
        "managed_data_flow",
        "policy_governance",
        "mdm_strategy_selection",
        "device_onboarding",
        "reference_configuration_rollout",
        "administration_procedures",
        "hardened_device_procurement",
        "mdm_compliance",
        "secure_boot_hardware",
    ]
    expect(
        [rule.concept_id for rule in semantic_rules.SEMANTIC_CONCEPT_RULES]
        == expected_concept_ids
    )

    apple_mapping = recommendation_mapping.apple_schema_analog_mappings_for(
        "IOS", "AirDrop must be disabled", False
    )
    expect(len(apple_mapping) == 1)
    expect(apple_mapping[0]["schemaId"] == "profile:com.apple.applicationaccess")
    expect(apple_mapping[0]["values"] == {"allowAirDrop": False})

    concepts = recommendation_mapping.semantic_concepts_for(
        "IOS", evidence("The device must enforce a passcode.")
    )
    expect([concept["id"] for concept in concepts] == ["passcode_authentication"])
