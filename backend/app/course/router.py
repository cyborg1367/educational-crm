from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.course import service as course_service
from app.course.model import Course
from app.course.schemas import CourseCreate, CourseRead, CourseUpdate
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[CourseRead])
def list_courses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Course]:
    return course_service.list_courses(db, current_user.org_id)


@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    return course_service.get_course(db, current_user.org_id, course_id)


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    return course_service.create_course(db, current_user.org_id, body)


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: int,
    body: CourseUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    return course_service.update_course(db, current_user.org_id, course_id, body)
