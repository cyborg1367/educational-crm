"""Shared field validators used across API schemas."""


def normalize_staff_email(value: str) -> str:
    normalized = value.strip().lower()
    if "@" not in normalized or not normalized.split("@", 1)[1]:
        raise ValueError("value is not a valid email address")
    return normalized
