from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.communication import service as communication_service
from app.communication.model import Communication
from app.communication.schemas import CommunicationCreate, CommunicationRead
from app.core.db import get_db
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[CommunicationRead])
def list_communications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    person_id: Annotated[int | None, Query()] = None,
) -> list[Communication]:
    return communication_service.list_communications(
        db, current_user.org_id, person_id=person_id
    )


@router.post("", response_model=CommunicationRead, status_code=status.HTTP_201_CREATED)
def create_communication(
    body: CommunicationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Communication:
    return communication_service.log_communication(db, current_user.org_id, body)
