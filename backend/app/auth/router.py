from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import service as auth_service
from app.auth.schemas import LoginRequest, TokenResponse
from app.core.db import get_db

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    return auth_service.login(db, email=body.email, password=body.password)
