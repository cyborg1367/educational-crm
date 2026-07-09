from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.course import service as course_service
from app.course.model import Course
from app.course.schemas import CourseCreate, CourseRead, CourseUpdate
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[CourseRead])
def list_courses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    department_id: Annotated[
        int | None, Query(description="Filter by owning department.")
    ] = None,
    is_active: Annotated[
        bool | None, Query(description="Filter by active flag.")
    ] = None,
) -> PaginatedResponse[CourseRead]:
    """List courses.

    Returns a paginated list of course catalog entries in the organization.
    """
    items, total_count = course_service.list_courses(
        db,
        current_user.org_id,
        department_id=department_id,
        is_active=is_active,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    """Get a course by ID.

    Fetches a single course record from the organization.
    Returns 404 if the course is not found in the org.
    """
    return course_service.get_course(db, current_user.org_id, course_id)


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    """Create a new course.

    Adds a course to the catalog under a department.
    Returns 404 if the department is not found.
    Returns 422 if request validation fails.
    """
    return course_service.create_course(db, current_user.org_id, body)


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: int,
    body: CourseUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    """Update a course.

    Applies partial updates to an existing course.
    Returns 404 if the course or department is not found.
    Returns 422 if request validation fails.
    """
    return course_service.update_course(db, current_user.org_id, course_id, body)
