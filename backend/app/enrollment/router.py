from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.rate_limit import SENSITIVE_LIMIT
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.enrollment import service as enrollment_service
from app.enrollment.model import Enrollment
from app.enrollment.schemas import (
    EnrollmentCreate,
    EnrollmentDrop,
    EnrollmentRead,
    EnrollmentUpdate,
)
from app.user.model import User
from app.workflow import service as workflow_service

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[EnrollmentRead])
def list_enrollments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[EnrollmentRead]:
    """List enrollments.

    Returns a paginated list of enrollments in the organization.
    """
    items, total_count = enrollment_service.list_enrollments(
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


@router.get("/{enrollment_id}", response_model=EnrollmentRead)
def get_enrollment(
    enrollment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Enrollment:
    """Get an enrollment by ID.

    Fetches a single enrollment with price snapshots.
    Returns 404 if the enrollment is not found in the org.
    """
    return enrollment_service.get_enrollment(db, current_user.org_id, enrollment_id)


@router.post("", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    body: EnrollmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Enrollment:
    """Create a new enrollment.

    Enrolls a person in a class and triggers post-enrollment workflow.
    Returns 404 if person, class, consultation, or journey is not found.
    Returns 409 if the person already has a live enrollment for this class.
    Returns 422 if discount exceeds price or validation fails.
    """
    enrollment = enrollment_service.create_enrollment(db, current_user.org_id, body)
    workflow_service.on_enrollment_created(
        db, current_user.org_id, enrollment.id, actor_id=current_user.id
    )
    return enrollment


@router.patch("/{enrollment_id}", response_model=EnrollmentRead)
def update_enrollment(
    enrollment_id: int,
    body: EnrollmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Enrollment:
    """Update an enrollment.

    Updates enrollment status or start date.
    Returns 404 if the enrollment is not found.
    Returns 409 if the status change would create a duplicate live enrollment.
    Returns 422 if request validation fails.
    """
    return enrollment_service.update_status(db, current_user.org_id, enrollment_id, body)


@router.patch("/{enrollment_id}/drop", response_model=EnrollmentRead)
@SENSITIVE_LIMIT
def drop_enrollment(
    request: Request,
    enrollment_id: int,
    body: EnrollmentDrop,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Enrollment:
    """Drop an enrollment.

    Marks the enrollment as dropped, cancels installments, refunds payments,
    and cancels related tasks.
    Returns 404 if the enrollment is not found.
    Returns 422 if the enrollment is already dropped.
    """
    return enrollment_service.drop_enrollment(
        db,
        current_user.org_id,
        enrollment_id,
        body.reason,
        current_user.id,
        notes=body.notes,
    )
