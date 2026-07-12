"""Tests for the conditional guardian/extra-phones requirement.

A person's extra_phones list is optional in general (someone may just have
a second personal number), but at least one entry becomes required once
birth_date shows the person is under 18 — the first entry doubles as the
parent/guardian's number in that case.
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


def test_create_minor_with_blank_extra_phones_rejected(
    db_session: Session, org_id: int
) -> None:
    with pytest.raises(Exception) as exc_info:
        person_service.create_person(
            db_session,
            org_id,
            PersonCreate(
                full_name="Young Person",
                birth_date=_minor_birth_date(),
                extra_phones=["  "],
            ),
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
            extra_phones=["09120000000"],
        ),
    )
    assert person.extra_phones == ["09120000000"]


def test_extra_phones_supports_multiple_numbers(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(
            full_name="Adult Person",
            extra_phones=["09120000000", "09130000000", "09140000000"],
        ),
    )
    assert person.extra_phones == ["09120000000", "09130000000", "09140000000"]


def test_create_adult_without_extra_phones_succeeds(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="Adult Person", birth_date=_adult_birth_date()),
    )
    assert person.extra_phones is None


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


def test_update_birth_date_to_minor_with_existing_extra_phone_succeeds(
    db_session: Session, org_id: int
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="Adult Person", extra_phones=["09120000000"]),
    )

    updated = person_service.update_person(
        db_session,
        org_id,
        person.id,
        PersonUpdate(birth_date=_minor_birth_date()),
    )
    assert updated.birth_date == _minor_birth_date()
    assert updated.extra_phones == ["09120000000"]
