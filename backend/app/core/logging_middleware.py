"""HTTP request/response logging with per-request context."""

from __future__ import annotations

import time
import uuid

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.auth.security import decode_token
from app.core.logging_config import (
    bind_request_context,
    clear_request_context,
    get_logger,
)

logger = get_logger("app.access")


def _token_context(authorization: str | None) -> tuple[int | None, int | None]:
    if not authorization or not authorization.startswith("Bearer "):
        return None, None
    try:
        payload = decode_token(authorization.removeprefix("Bearer "))
        return int(payload["sub"]), int(payload["org_id"])
    except (JWTError, KeyError, TypeError, ValueError):
        return None, None


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = str(uuid.uuid4())
        user_id, org_id = _token_context(request.headers.get("Authorization"))
        bind_request_context(
            request_id=request_id, user_id=user_id, org_id=org_id
        )
        request.state.request_id = request_id

        start = time.perf_counter()
        logger.info(
            "request_started",
            extra={
                "event": "request_started",
                "method": request.method,
                "path": request.url.path,
                "query_string": request.url.query,
            },
        )
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "request_completed",
                extra={
                    "event": "request_completed",
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            clear_request_context()
