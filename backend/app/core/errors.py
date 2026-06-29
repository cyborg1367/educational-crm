from datetime import datetime, timezone

from fastapi import HTTPException, status


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class CRMException(HTTPException):
    def __init__(
        self,
        *,
        status_code: int,
        detail: str,
        error_code: str,
        field: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code
        self.field = field
        self.timestamp = utc_timestamp()

    def to_body(self) -> dict[str, str]:
        body: dict[str, str] = {
            "detail": self.detail,
            "error_code": self.error_code,
            "timestamp": self.timestamp,
        }
        if self.field is not None:
            body["field"] = self.field
        return body


class NotFoundError(CRMException):
    def __init__(self, detail: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND",
        )


class ConflictError(CRMException):
    def __init__(self, detail: str) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT",
        )


class ValidationError(CRMException):
    def __init__(self, detail: str, field: str = "") -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR",
            field=field or None,
        )


class PermissionError(CRMException):
    def __init__(self, detail: str) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="PERMISSION_DENIED",
        )


class AuthenticationError(CRMException):
    def __init__(
        self, detail: str, *, headers: dict[str, str] | None = None
    ) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTHENTICATION_ERROR",
            headers=headers,
        )
