from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.consultation import service as consultation_service
from app.consultation.model import Consultation
from app.consultation.schemas import (
    ConsultationCreate,
    ConsultationRead,
    ConsultationUpdate,
)
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.user.model import User
from app.workflow import service as workflow_service
from app.workflow.schemas import ConsultationOutcomeUpdate

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=list[ConsultationRead])
def list_consultations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Consultation]:
    """List all consultations.

    Returns every consultation record in the authenticated user's organization.
    """
    return consultation_service.list_consultations(db, current_user.org_id)


@router.get("/{consultation_id}", response_model=ConsultationRead)
def get_consultation(
    consultation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    """Get a consultation by ID.

    Fetches a single consultation record from the organization.
    Returns 404 if the consultation is not found in the org.
    """
    return consultation_service.get_consultation(
        db, current_user.org_id, consultation_id
    )


@router.post("", response_model=ConsultationRead, status_code=status.HTTP_201_CREATED)
def create_consultation(
    body: ConsultationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    """Create a new consultation.

    Records an initial or follow-up consultation with a prospect.
    Returns 404 if referenced person, department, consultant, or course is not found.
    Returns 422 if request validation fails.
    """
    return consultation_service.create_consultation(db, current_user.org_id, body)


@router.patch("/{consultation_id}", response_model=ConsultationRead)
def update_consultation(
    consultation_id: int,
    body: ConsultationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    """Update a consultation.

    Applies partial updates to consultation notes and metadata.
    Returns 404 if the consultation or referenced entities are not found.
    Returns 422 if request validation fails.
    """
    return consultation_service.update_consultation(
        db, current_user.org_id, consultation_id, body
    )


@router.patch("/{consultation_id}/outcome", response_model=ConsultationRead)
def set_consultation_outcome(
    consultation_id: int,
    body: ConsultationOutcomeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    """Set consultation outcome and trigger workflow.

    Records the consultation outcome and runs automated routing (enrollment,
    follow-up tasks, referrals, etc.).
    Returns 404 if the consultation or referenced entities are not found.
    Returns 422 if the outcome requires missing data (e.g. class_id, refer_to_department_id).
    """
    return workflow_service.on_consultation_outcome(
        db,
        current_user.org_id,
        consultation_id,
        body.outcome,
        class_id=body.class_id,
        actor_id=current_user.id,
    )
