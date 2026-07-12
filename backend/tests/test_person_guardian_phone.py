"""Tests for the conditional guardian/secondary phone requirement.

A person's secondary_phone is optional in general, but becomes required
(and is treated as the parent/guardian's number) once birth_date shows
the person is under 18.
"""

from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.person import service as person_service
from app.person.schemas import PersonCreate, PersonUpdate
from app.user.model import User


def _minor_birth_date() -> date:
    today = date.today()
    return date(today.year - 10, today.month, today.day)


def _adult_birth_date() -> date:
    today = date.today()
    return date(today.year - 30, today.month, today.day)


def test_create_minor_without_guardian_phone_rejected(
    db_session: Session, org_id: int
) -> None:
    with pytest.raises(Exception) as exc_info:
        person_service.create_person(
            db_session,
            org_id,
            PersonCreate(full_name="Young Person", birth_date=_minor_birth_date()),
        )
    assert getattr(exc_info.value, "status_code", None) == 422


def test_create_minor_with_guardian_phone_succeeds(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(
            full_name="Young Person",
            birth_date=_minor_birth_date(),
            secondary_phone="09120000000",
        ),
    )
    assert person.secondary_phone == "09120000000"


def test_create_adult_without_secondary_phone_succeeds(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="Adult Person", birth_date=_adult_birth_date()),
    )
    assert person.secondary_phone is None


def test_update_birth_date_to_minor_without_guardian_phone_rejected(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session, org_id, PersonCreate(full_name="Adult Person")
    )

    with pytest.raises(Exception) as exc_info:
        person_service.update_person(
            db_session,
            org_id,
            person.id,
            PersonUpdate(birth_date=_minor_birth_date()),
        )
    assert getattr(exc_info.value, "status_code", None) == 422


def test_update_birth_date_to_minor_with_existing_secondary_phone_succeeds(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="Adult Person", secondary_phone="09120000000"),
    )

    updated = person_service.update_person(
        db_session,
        org_id,
        person.id,
        PersonUpdate(birth_date=_minor_birth_date()),
    )
    assert updated.birth_date == _minor_birth_date()
    assert updated.secondary_phone == "09120000000"
