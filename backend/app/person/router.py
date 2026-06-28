from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.person import service as person_service
from app.person.model import Person
from app.person.schemas import PersonCreate, PersonRead, PersonUpdate
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[PersonRead])
def list_people(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Person]:
    return person_service.list_people(db, current_user.org_id)


@router.get("/{person_id}", response_model=PersonRead)
def get_person(
    person_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Person:
    return person_service.get_person(db, current_user.org_id, person_id)


@router.post("", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
def create_person(
    body: PersonCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Person:
    return person_service.create_person(db, current_user.org_id, body)


@router.patch("/{person_id}", response_model=PersonRead)
def update_person(
    person_id: int,
    body: PersonUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Person:
    return person_service.update_person(db, current_user.org_id, person_id, body)
