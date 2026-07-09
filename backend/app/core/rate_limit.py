"""Rate limiting via slowapi — IP-based defaults with stricter auth/payment limits."""

from __future__ import annotations

import json

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

DEFAULT_LIMIT = "100/minute"
AUTH_LIMIT_VALUE = "5/minute"
SENSITIVE_LIMIT_VALUE = "10/minute"


def get_client_ip(request: Request) -> str:
    return get_remote_address(request)


def get_ip_rate_limit_key(request: Request) -> str:
    return get_client_ip(request)


def get_auth_rate_limit_key(request: Request) -> str:
    """IP + email for login — limits brute-force per account, not only per IP."""
    ip = get_client_ip(request)
    email = getattr(request.state, "login_email", "")
    return f"{ip}:{email}"


limiter = Limiter(
    key_func=get_ip_rate_limit_key,
    default_limits=[DEFAULT_LIMIT],
    storage_uri=settings.RATE_LIMIT_STORAGE_URI,
)

AUTH_LIMIT = limiter.limit(AUTH_LIMIT_VALUE, key_func=get_auth_rate_limit_key)
SENSITIVE_LIMIT = limiter.limit(SENSITIVE_LIMIT_VALUE)


class LoginEmailMiddleware(BaseHTTPMiddleware):
    """Parse login body so auth rate-limit keys can include the email."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.method == "POST" and request.url.path.rstrip("/").endswith("/login"):
            body = await request.body()
            email = ""
            if body:
                try:
                    data = json.loads(body)
                    email = str(data.get("email", "")).lower().strip()
                except json.JSONDecodeError:
                    pass
            request.state.login_email = email

            async def receive() -> dict[str, object]:
                return {"type": "http.request", "body": body, "more_body": False}

            request._receive = receive
        return await call_next(request)


__all__ = [
    "AUTH_LIMIT",
    "LoginEmailMiddleware",
    "RateLimitExceeded",
    "SENSITIVE_LIMIT",
    "SlowAPIMiddleware",
    "_rate_limit_exceeded_handler",
    "limiter",
]
