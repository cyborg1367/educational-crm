from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status

from app.core.errors import CRMException, utc_timestamp

_STATUS_TO_ERROR_CODE: dict[int, str] = {
    status.HTTP_401_UNAUTHORIZED: "AUTHENTICATION_ERROR",
    status.HTTP_403_FORBIDDEN: "PERMISSION_DENIED",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "CONFLICT",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
}


def _humanize_pydantic_error(error: dict) -> tuple[str, str | None]:
    loc = error.get("loc", ())
    field = str(loc[-1]) if loc else None
    err_type = error.get("type", "")
    ctx = error.get("ctx") or {}

    if "greater_than" in err_type:
        gt = ctx.get("gt")
        if gt == 0:
            label = (field or "Value").replace("_", " ").title()
            return f"{label} must be > 0", field

    if "greater_than_equal" in err_type:
        ge = ctx.get("ge")
        if ge == 1:
            label = (field or "Value").replace("_", " ").title()
            return f"{label} must be >= 1", field

    if "less_than" in err_type:
        lt = ctx.get("lt")
        if lt is not None:
            label = (field or "Value").replace("_", " ").title()
            return f"{label} must be < {lt}", field

    if err_type == "missing":
        label = (field or "Field").replace("_", " ").title()
        return f"{label} is required", field

    if err_type == "string_too_short":
        min_length = ctx.get("min_length")
        label = (field or "Field").replace("_", " ").title()
        if min_length == 1:
            return f"{label} cannot be empty", field
        return f"{label} is too short", field

    if err_type == "enum":
        label = (field or "Value").replace("_", " ").title()
        return f"Invalid {label.lower()}", field

    msg = error.get("msg", "Validation failed")
    if msg.startswith("Value error, "):
        msg = msg.removeprefix("Value error, ")
    return msg, field


def _error_body(
    detail: str,
    error_code: str,
    *,
    field: str | None = None,
) -> dict[str, str]:
    body: dict[str, str] = {
        "detail": detail,
        "error_code": error_code,
        "timestamp": utc_timestamp(),
    }
    if field is not None:
        body["field"] = field
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(CRMException)
    async def crm_exception_handler(
        _request: Request, exc: CRMException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_body(),
            headers=exc.headers,
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        _request: Request, exc: HTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        error_code = _STATUS_TO_ERROR_CODE.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(detail, error_code),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        if errors:
            detail, field = _humanize_pydantic_error(errors[0])
        else:
            detail, field = "Validation failed", None
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(detail, "VALIDATION_ERROR", field=field),
        )
