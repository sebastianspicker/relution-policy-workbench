"""Apple Numeric helpers for recommendation mapping."""

from .candidate_inference_common import (
    APPLE_PASSCODE,
    Any,
    apple_schema_mapping,
    first_int,
)

from .candidate_inference_apple_numeric_macos import (
    macos_numeric_analog_mappings,
)

def apple_numeric_analog_mappings_for(
    platform: str, haystack: str
) -> list[dict[str, Any]]:
    """Return numeric Apple analog mappings for supported Apple platforms."""
    mappings: list[dict[str, Any]] = []
    if platform == "IOS":
        mappings.extend(ios_numeric_analog_mappings(haystack))
    if platform == "MACOS":
        mappings.extend(macos_numeric_analog_mappings(haystack))
    return mappings
def ios_numeric_analog_mappings(haystack: str) -> list[dict[str, Any]]:
    """Infer iOS passcode numeric analog mappings from normalized text."""
    mappings: list[dict[str, Any]] = []
    if "require alphanumeric value" in haystack and "enabled" in haystack:
        mappings.append(
            apple_schema_mapping(
                APPLE_PASSCODE,
                {"requireAlphanumeric": True},
                ("requireAlphanumeric",),
                reason="Curated Apple passcode analog matched alphanumeric requirement.",
            )
        )
    if (
        "minimum passcode length" in haystack or "minimum password length" in haystack
    ) and (minimum := first_int(haystack)) is not None:
        mappings.append(
            apple_schema_mapping(
                APPLE_PASSCODE,
                {"minLength": minimum},
                ("minLength",),
                constraints=(("minLength", "atLeast", minimum),),
                reason="Curated Apple passcode analog matched minimum length requirement.",
            )
        )
    if (
        "maximum auto-lock" in haystack
        or "maximum minutes of inactivity until screen locks" in haystack
    ) and (maximum := first_int(haystack)) is not None:
        mappings.append(
            apple_schema_mapping(
                APPLE_PASSCODE,
                {"maxInactivity": maximum},
                ("maxInactivity",),
                constraints=(("maxInactivity", "atMost", maximum),),
                reason="Curated Apple passcode analog matched auto-lock maximum requirement.",
            )
        )
    if "maximum grace period for device lock" in haystack and "immediately" in haystack:
        mappings.append(
            apple_schema_mapping(
                APPLE_PASSCODE,
                {"maxGracePeriod": 0},
                ("maxGracePeriod",),
                reason="Curated Apple passcode analog matched immediate device-lock grace period.",
            )
        )
    if (
        "maximum number of failed attempts" in haystack
        and (attempts := first_int(haystack)) is not None
    ):
        mappings.append(
            apple_schema_mapping(
                APPLE_PASSCODE,
                {"maxFailedAttempts": attempts},
                ("maxFailedAttempts",),
                reason="Curated Apple passcode analog matched failed-attempt limit.",
            )
        )
    return mappings
