from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.course import service as course_service
from app.course.schemas import CourseRead, DepartmentRoadmapResponse
from app.department import service as department_service
from app.department.model import Department
from app.department.schemas import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[DepartmentRead])
def list_departments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[DepartmentRead]:
    """List departments.

    Returns a paginated list of departments in the authenticated user's organization.
    """
    items, total_count = department_service.list_departments(
        db,
        current_user.org_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{department_id}/roadmap", response_model=DepartmentRoadmapResponse)
def get_department_roadmap(
    department_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DepartmentRoadmapResponse:
    """Get the department learning roadmap graph data.

    Returns all active courses in the department with prerequisite links.
    Returns 404 if the department is not found in the org.
    """
    courses = course_service.get_department_roadmap(
        db, current_user.org_id, department_id
    )
    return DepartmentRoadmapResponse(
        courses=[CourseRead.model_validate(course) for course in courses]
    )


@router.get("/{department_id}", response_model=DepartmentRead)
def get_department(
    department_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Department:
    """Get a department by ID.

    Fetches a single department record from the organization.
    Returns 404 if the department is not found in the org.
    """
    return department_service.get_department(db, current_user.org_id, department_id)


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    body: DepartmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Department:
    """Create a new department.

    Adds a department to the organization.
    Returns 404 if manager_id references a user not in the org.
    Returns 422 if request validation fails.
    """
    return department_service.create_department(db, current_user.org_id, body)


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    body: DepartmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Department:
    """Update a department.

    Applies partial updates to an existing department.
    Returns 404 if the department or referenced manager is not found.
    Returns 422 if request validation fails.
    """
    return department_service.update_department(
        db, current_user.org_id, department_id, body
    )
