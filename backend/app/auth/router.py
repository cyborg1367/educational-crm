from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import service as auth_service
from app.auth.schemas import LoginRequest, TokenResponse
from app.core.db import get_db

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={401: {"description": "Invalid email or password."}},
)
def login(
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Authenticate and obtain an access token.

    Validates credentials and returns a JWT bearer token for API access.
    Returns 401 if email or password is incorrect.
    Returns 422 if request validation fails.
    """
    return auth_service.login(db, email=body.email, password=body.password)
