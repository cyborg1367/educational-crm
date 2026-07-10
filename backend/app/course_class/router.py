from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_role
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.course_class import service as class_service
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.course_class.schemas import CourseClassCreate, CourseClassRead, CourseClassUpdate
from app.user.enums import UserRole
from app.user.model import User
from app.workflow import service as workflow_service

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[CourseClassRead])
def list_classes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    status: Annotated[
        ClassStatus | None, Query(description="Filter by class status.")
    ] = None,
) -> PaginatedResponse[CourseClassRead]:
    """List classes.

    Returns a paginated list of scheduled class instances in the organization.
    """
    items, total_count = class_service.list_classes(
        db,
        current_user.org_id,
        status=status,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


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
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.admin,
                UserRole.admission,
                UserRole.department_manager,
            )
        ),
    ],
) -> CourseClass:
    """Create a new class.

    Schedules a class instance for a course with an assigned teacher.
    Department managers may only create classes for courses in their department.
    Returns 403 if the caller role is not permitted.
    Returns 404 if the course or teacher is not found.
    Returns 422 if teacher_id does not reference a user with the teacher role.
    """
    return class_service.create_class(
        db, current_user.org_id, body, actor=current_user
    )


@router.patch("/{class_id}", response_model=CourseClassRead)
def update_class(
    class_id: int,
    body: CourseClassUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.admin,
                UserRole.admission,
                UserRole.department_manager,
            )
        ),
    ],
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
        db, current_user.org_id, class_id, body, actor=current_user
    )

    if not was_completed and course_class.status == ClassStatus.completed:
        workflow_service.on_class_completed(
            db, current_user.org_id, class_id, actor_id=current_user.id
        )

    return course_class


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.admin,
                UserRole.admission,
                UserRole.department_manager,
            )
        ),
    ],
) -> None:
    """Delete a class.

    Removes a scheduled class instance from the organization.
    Returns 404 if the class is not found.
    Returns 422 if the class has active enrollments.
    """
    class_service.delete_class(db, current_user.org_id, class_id)
