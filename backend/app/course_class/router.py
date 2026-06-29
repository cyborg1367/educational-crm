from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.course_class import service as class_service
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.course_class.schemas import CourseClassCreate, CourseClassRead, CourseClassUpdate
from app.user.model import User
from app.workflow import service as workflow_service

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=list[CourseClassRead])
def list_classes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseClass]:
    """List all classes.

    Returns every scheduled class instance in the authenticated user's organization.
    """
    return class_service.list_classes(db, current_user.org_id)


@router.get("/{class_id}", response_model=CourseClassRead)
def get_class(
    class_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseClass:
    """Get a class by ID.

    Fetches a single class instance from the organization.
    Returns 404 if the class is not found in the org.
    """
    return class_service.get_class(db, current_user.org_id, class_id)


@router.post("", response_model=CourseClassRead, status_code=status.HTTP_201_CREATED)
def create_class(
    body: CourseClassCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseClass:
    """Create a new class.

    Schedules a class instance for a course with an assigned teacher.
    Returns 404 if the course or teacher is not found.
    Returns 422 if teacher_id does not reference a user with the teacher role.
    """
    return class_service.create_class(db, current_user.org_id, body)


@router.patch("/{class_id}", response_model=CourseClassRead)
def update_class(
    class_id: int,
    body: CourseClassUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseClass:
    """Update a class.

    Applies partial updates to an existing class. Triggers workflow side effects
    when status transitions to completed.
    Returns 404 if the class, course, or teacher is not found.
    Returns 422 if teacher_id is invalid or request validation fails.
    """
    existing = class_service.get_class(db, current_user.org_id, class_id)
    was_completed = existing.status == ClassStatus.completed

    course_class = class_service.update_class(
        db, current_user.org_id, class_id, body
    )

    if not was_completed and course_class.status == ClassStatus.completed:
        workflow_service.on_class_completed(
            db, current_user.org_id, class_id, actor_id=current_user.id
        )

    return course_class
