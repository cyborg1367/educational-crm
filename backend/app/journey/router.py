from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.journey import service as journey_service
from app.journey.model import Journey
from app.journey.schemas import JourneyCreate, JourneyRead, JourneyUpdate
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=list[JourneyRead])
def list_journeys(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Journey]:
    """List all journeys.

    Returns every student journey in the authenticated user's organization.
    """
    return journey_service.list_journeys(db, current_user.org_id)


@router.get("/{journey_id}", response_model=JourneyRead)
def get_journey(
    journey_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Journey:
    """Get a journey by ID.

    Fetches a single journey tracking a person's progress in a department.
    Returns 404 if the journey is not found in the org.
    """
    return journey_service.get_journey(db, current_user.org_id, journey_id)


@router.post("", response_model=JourneyRead, status_code=status.HTTP_201_CREATED)
def create_journey(
    body: JourneyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Journey:
    """Create a new journey.

    Starts tracking a person's path through a department.
    Returns 404 if person, department, owner, or roadmap is not found.
    Returns 409 if a journey already exists for this person and department.
    Returns 422 if request validation fails.
    """
    return journey_service.create_journey(db, current_user.org_id, body)


@router.patch("/{journey_id}", response_model=JourneyRead)
def update_journey(
    journey_id: int,
    body: JourneyUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Journey:
    """Update a journey.

    Applies partial updates such as owner, roadmap, or status.
    Returns 404 if the journey or referenced entities are not found.
    Returns 422 if request validation fails.
    """
    return journey_service.update_journey(db, current_user.org_id, journey_id, body)
