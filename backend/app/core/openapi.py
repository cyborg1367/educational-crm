"""Shared OpenAPI response definitions for Swagger UI."""

PROTECTED_RESPONSES: dict[int, dict[str, str]] = {
    401: {"description": "Missing or invalid authentication token."},
    403: {"description": "Authenticated but not permitted to perform this action."},
}
