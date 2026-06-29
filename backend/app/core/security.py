"""CORS and HTTP security configuration."""

from __future__ import annotations

import os

_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]


def _environment() -> str:
    return os.environ.get("ENVIRONMENT", "development").lower()


def get_cors_origins() -> list[str]:
    if _environment() == "production":
        raw = os.environ.get("CORS_ORIGINS", "")
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return list(_DEV_ORIGINS)


def get_cors_middleware_kwargs() -> dict:
    return {
        "allow_origins": get_cors_origins(),
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PATCH", "DELETE"],
        "allow_headers": ["*"],
    }
