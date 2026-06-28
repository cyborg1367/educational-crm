from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.enrollment import service as enrollment_service
from app.enrollment.model import Enrollment
from app.enrollment.schemas import EnrollmentCreate, EnrollmentRead, EnrollmentUpdate
from app.user.model import User
from app.workflow import service as workflow_service

router = APIRouter()


@router.get("", response_model=list[EnrollmentRead])
def list_enrollments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Enrollment]:
    return enrollment_service.list_enrollments(db, current_user.org_id)


@router.get("/{enrollment_id}", response_model=EnrollmentRead)
def get_enrollment(
    enrollment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Enrollment:
    return enrollment_service.get_enrollment(db, current_user.org_id, enrollment_id)


@router.post("", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    body: EnrollmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Enrollment:
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
    return enrollment_service.update_status(db, current_user.org_id, enrollment_id, body)
