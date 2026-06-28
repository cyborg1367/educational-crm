from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.course_class import service as class_service
from app.course_class.model import CourseClass
from app.course_class.schemas import CourseClassCreate, CourseClassRead, CourseClassUpdate
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[CourseClassRead])
def list_classes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseClass]:
    return class_service.list_classes(db, current_user.org_id)


@router.get("/{class_id}", response_model=CourseClassRead)
def get_class(
    class_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseClass:
    return class_service.get_class(db, current_user.org_id, class_id)


@router.post("", response_model=CourseClassRead, status_code=status.HTTP_201_CREATED)
def create_class(
    body: CourseClassCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseClass:
    return class_service.create_class(db, current_user.org_id, body)


@router.patch("/{class_id}", response_model=CourseClassRead)
def update_class(
    class_id: int,
    body: CourseClassUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseClass:
    return class_service.update_class(db, current_user.org_id, class_id, body)
