"""Structured JSON logging to stdout with per-request context."""

from __future__ import annotations

import json
import logging
import os
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[int | None] = ContextVar("user_id", default=None)
org_id_var: ContextVar[int | None] = ContextVar("org_id", default=None)

_STANDARD_RECORD_ATTRS = frozenset(
    logging.LogRecord(
        name="",
        level=0,
        pathname="",
        lineno=0,
        msg="",
        args=(),
        exc_info=None,
    ).__dict__
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger_name": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
            "org_id": org_id_var.get(),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_RECORD_ATTRS:
                entry[key] = value
        return json.dumps(entry, default=str)


def configure_logging() -> None:
    environment = os.environ.get("ENVIRONMENT", "development").lower()
    level = logging.WARNING if environment == "production" else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def bind_request_context(
    *,
    request_id: str,
    user_id: int | None = None,
    org_id: int | None = None,
) -> None:
    request_id_var.set(request_id)
    user_id_var.set(user_id)
    org_id_var.set(org_id)


def clear_request_context() -> None:
    request_id_var.set(None)
    user_id_var.set(None)
    org_id_var.set(None)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
