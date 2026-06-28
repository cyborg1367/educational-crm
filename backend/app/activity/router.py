from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.activity.model import Activity
from app.activity.schemas import ActivityCreate, ActivityRead
from app.auth.deps import get_current_user
from app.core.db import get_db
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[ActivityRead])
def list_activities(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    person_id: Annotated[int | None, Query()] = None,
) -> list[Activity]:
    return activity_service.list_activities(
        db, current_user.org_id, person_id=person_id
    )


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    body: ActivityCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Activity:
    return activity_service.log_activity(
        db,
        current_user.org_id,
        body.person_id,
        body.action,
        payload=body.payload,
        actor_id=body.actor_id if body.actor_id is not None else current_user.id,
    )
