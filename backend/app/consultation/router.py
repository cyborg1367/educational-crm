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
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[ConsultationRead])
def list_consultations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Consultation]:
    return consultation_service.list_consultations(db, current_user.org_id)


@router.get("/{consultation_id}", response_model=ConsultationRead)
def get_consultation(
    consultation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    return consultation_service.get_consultation(
        db, current_user.org_id, consultation_id
    )


@router.post("", response_model=ConsultationRead, status_code=status.HTTP_201_CREATED)
def create_consultation(
    body: ConsultationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    return consultation_service.create_consultation(db, current_user.org_id, body)


@router.patch("/{consultation_id}", response_model=ConsultationRead)
def update_consultation(
    consultation_id: int,
    body: ConsultationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Consultation:
    return consultation_service.update_consultation(
        db, current_user.org_id, consultation_id, body
    )
