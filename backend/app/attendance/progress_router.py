from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.attendance import progress as progress_service
from app.attendance.schemas import (
    JourneyRoadmapWaiverCreate,
    JourneyRoadmapWaiverRead,
    PersonRoadmapProgressRead,
)
from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("/{person_id}/progress", response_model=PersonRoadmapProgressRead)
def get_person_roadmap_progress(
    person_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    journey_id: Annotated[
        int | None,
        Query(description="Optional journey to highlight in the response."),
    ] = None,
) -> PersonRoadmapProgressRead:
    """Get computed roadmap progress for a person.

    Returns per-journey step status derived from enrollments, waivers, and prerequisites.
    Returns 404 if the person is not found in the org.
    """
    return progress_service.compute_person_roadmap_progress(
        db,
        current_user.org_id,
        person_id,
        journey_id=journey_id,
    )


@router.post(
    "/{person_id}/journeys/{journey_id}/waivers",
    response_model=JourneyRoadmapWaiverRead,
    status_code=status.HTTP_201_CREATED,
)
def create_person_journey_waiver(
    person_id: int,
    journey_id: int,
    body: JourneyRoadmapWaiverCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> JourneyRoadmapWaiverRead:
    """Waive a roadmap step for placement / mid-path entry.

    Marks a prior roadmap item as credited without a completed enrollment.
    Returns 404 if the person/journey is not found.
    Returns 409 if the step is already waived.
    Returns 422 if the step has a live enrollment or is invalid for this journey.
    """
    waiver = progress_service.create_journey_roadmap_waiver(
        db,
        current_user.org_id,
        person_id,
        journey_id,
        body,
        waived_by=current_user.id,
    )
    return JourneyRoadmapWaiverRead.model_validate(waiver)


@router.delete(
    "/{person_id}/journeys/{journey_id}/waivers/{waiver_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_person_journey_waiver(
    person_id: int,
    journey_id: int,
    waiver_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Remove a roadmap step waiver.

    Returns 404 if the person, journey, or waiver is not found.
    """
    progress_service.delete_journey_roadmap_waiver(
        db,
        current_user.org_id,
        person_id,
        journey_id,
        waiver_id,
        actor_id=current_user.id,
    )
