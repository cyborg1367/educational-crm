from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.tenancy.scoping import scoped
from app.user.model import User
from app.user.schemas import UserCreate, UserUpdate


def list_users(db: Session, org_id: int) -> list[User]:
    stmt = scoped(select(User), User, org_id).order_by(User.name)
    return list(db.scalars(stmt).all())


def get_user(db: Session, org_id: int, user_id: int) -> User:
    stmt = scoped(select(User), User, org_id).where(User.id == user_id)
    user = db.scalars(stmt).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def create_user(db: Session, org_id: int, data: UserCreate) -> User:
    existing = db.scalars(select(User).where(User.email == data.email)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        department_id=data.department_id,
        is_active=data.is_active,
        org_id=org_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, org_id: int, user_id: int, data: UserUpdate) -> User:
    user = get_user(db, org_id, user_id)
    updates = data.model_dump(exclude_unset=True)

    if "email" in updates and updates["email"] != user.email:
        existing = db.scalars(select(User).where(User.email == updates["email"])).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    if "password" in updates:
        user.password_hash = hash_password(updates.pop("password"))

    for field, value in updates.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, org_id: int, user_id: int) -> None:
    user = get_user(db, org_id, user_id)
    db.delete(user)
    db.commit()
