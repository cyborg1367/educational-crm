from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.activity.model import Activity
from app.activity.schemas import ActivityCreate, ActivityRead
from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[ActivityRead])
def list_activities(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    person_id: Annotated[int | None, Query(description="Filter by person ID.")] = None,
) -> PaginatedResponse[ActivityRead]:
    """List activity timeline entries.

    Returns a paginated list of audit/timeline events, optionally filtered by person.
    """
    items, total_count = activity_service.list_activities(
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


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    body: ActivityCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Activity:
    """Log an activity event.

    Appends a timeline entry for a person. Defaults actor_id to the current user.
    Returns 404 if the person is not found in the org.
    Returns 422 if request validation fails.
    """
    return activity_service.log_activity(
        db,
        current_user.org_id,
        body.person_id,
        body.action,
        payload=body.payload,
        actor_id=body.actor_id if body.actor_id is not None else current_user.id,
    )
