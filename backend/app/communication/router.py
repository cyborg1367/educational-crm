from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.communication import service as communication_service
from app.communication.model import Communication
from app.communication.schemas import CommunicationCreate, CommunicationRead
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[CommunicationRead])
def list_communications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    person_id: Annotated[int | None, Query(description="Filter by person ID.")] = None,
) -> PaginatedResponse[CommunicationRead]:
    """List communications.

    Returns a paginated list of communication logs, optionally filtered by person.
    Returns 404 if person_id is provided but not found in the org.
    """
    items, total_count = communication_service.list_communications(
        db,
        current_user.org_id,
        person_id=person_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.post("", response_model=CommunicationRead, status_code=status.HTTP_201_CREATED)
def create_communication(
    body: CommunicationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Communication:
    """Log a communication.

    Records an inbound or outbound interaction with a person.
    Returns 404 if the person is not found in the org.
    Returns 422 if request validation fails.
    """
    return communication_service.log_communication(db, current_user.org_id, body)
