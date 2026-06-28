from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_role
from app.core.db import get_db
from app.user import service as user_service
from app.user.enums import UserRole
from app.user.model import User
from app.user.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter()


@router.get("", response_model=list[UserRead])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> list[User]:
    return user_service.list_users(db, current_user.org_id)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    return user_service.get_user(db, current_user.org_id, user_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    return user_service.create_user(db, current_user.org_id, body)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    return user_service.update_user(db, current_user.org_id, user_id, body)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> None:
    user_service.delete_user(db, current_user.org_id, user_id)
