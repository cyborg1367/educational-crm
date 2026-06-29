from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.person import service as person_service
from app.person.model import Person
from app.person.schemas import PersonCreate, PersonRead, PersonUpdate
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[PersonRead])
def list_people(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[PersonRead]:
    """List people in the organization.

    Returns a paginated list of person records scoped to the authenticated user's organization.
    """
    items, total_count = person_service.list_people(
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


@router.get("/{person_id}", response_model=PersonRead)
def get_person(
    person_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Person:
    """Get a person by ID.

    Fetches a single person record from the organization.
    Returns 404 if the person is not found in the org.
    """
    return person_service.get_person(db, current_user.org_id, person_id)


@router.post("", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
def create_person(
    body: PersonCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Person:
    """Create a new person.

    Registers a prospect or contact in the organization.
    Returns 409 if the phone number is already registered in the org.
    Returns 422 if request validation fails.
    """
    return person_service.create_person(db, current_user.org_id, body)


@router.patch("/{person_id}", response_model=PersonRead)
def update_person(
    person_id: int,
    body: PersonUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Person:
    """Update a person.

    Applies partial updates to an existing person record.
    Returns 404 if the person is not found.
    Returns 409 if the new phone number is already registered in the org.
    Returns 422 if request validation fails.
    """
    return person_service.update_person(db, current_user.org_id, person_id, body)
