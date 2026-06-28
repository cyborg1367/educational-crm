from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import decode_token
from app.core.db import get_db
from app.organization.model import Organization
from app.user.enums import UserRole
from app.user.model import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload["sub"])
        org_id = int(payload["org_id"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise credentials_exception from None

    user = db.scalars(
        select(User).where(User.id == user_id, User.org_id == org_id)
    ).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_org(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Organization:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        org_id = int(payload["org_id"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise credentials_exception from None

    org = db.scalars(select(Organization).where(Organization.id == org_id)).first()
    if org is None or not org.is_active:
        raise credentials_exception
    return org


def require_role(*roles: UserRole):
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
        return user

    return checker
