from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.auth import service as auth_service
from app.auth.deps import get_current_user
from app.auth.schemas import LoginRequest, TokenResponse
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.rate_limit import AUTH_LIMIT
from app.user.model import User
from app.user.schemas import UserRead

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"description": "Invalid email or password."},
        429: {"description": "Too many login attempts."},
    },
)
@AUTH_LIMIT
def login(
    request: Request,
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Authenticate and obtain an access token.

    Validates credentials and returns a JWT bearer token for API access.
    Returns 401 if email or password is incorrect.
    Returns 422 if request validation fails.
    """
    return auth_service.login(db, email=body.email, password=body.password)


@router.get(
    "/me",
    response_model=UserRead,
    responses=PROTECTED_RESPONSES,
)
def get_current_user_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get the currently authenticated user's profile."""
    return current_user
