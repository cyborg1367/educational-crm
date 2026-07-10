"""Basic CRUD validation tests."""

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.course_class import service as class_service
from app.course_class.model import CourseClass
from app.enrollment import service as enrollment_service
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.schemas import EnrollmentCreate, EnrollmentUpdate
from app.organization.model import Organization
from app.person import service as person_service
from app.person.model import Person
from app.person.schemas import PersonCreate
from app.user.model import User


def test_create_person_logs_person_created_activity(
    db_session: Session,
    org_id: int,
    admin_user: User,
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(
            full_name="New Lead",
            phone="09121112233",
            source="website",
        ),
        actor_id=admin_user.id,
    )

    activities, total = activity_service.list_activities(
        db_session, org_id, person_id=person.id
    )
    assert total == 1
    assert activities[0].action == "person_created"
    assert activities[0].actor_id == admin_user.id
    assert activities[0].payload == {"status": "prospect", "source": "website"}


def test_delete_person_removes_record_and_timeline(
    db_session: Session,
    org_id: int,
    admin_user: User,
) -> None:
    person = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="To Delete", phone="09123334455"),
        actor_id=admin_user.id,
    )

    person_service.delete_person(db_session, org_id, person.id)

    with pytest.raises(HTTPException) as exc_info:
        person_service.get_person(db_session, org_id, person.id)
    assert exc_info.value.status_code == 404

    activities, total = activity_service.list_activities(
        db_session, org_id, person_id=person.id
    )
    assert total == 0
    assert activities == []


def _create_second_org(db_session: Session) -> int:
    org = Organization(id=2, name="Other Org", is_active=True)
    db_session.add(org)
    db_session.commit()
    return org.id


def test_person_phone_unique_per_org(db_session: Session, org_id: int) -> None:
    phone = "09120000000"
    person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="Person One", phone=phone),
    )

    with pytest.raises(HTTPException) as exc_info:
        person_service.create_person(
            db_session,
            org_id,
            PersonCreate(full_name="Person Two", phone=phone),
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Phone already registered"

    other_org_id = _create_second_org(db_session)
    other_person = person_service.create_person(
        db_session,
        other_org_id,
        PersonCreate(full_name="Person Other Org", phone=phone),
    )
    assert other_person.phone == phone
    assert other_person.org_id == other_org_id


def test_enrollment_person_class_unique_live(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")

    first = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            status=EnrollmentStatus.active,
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        enrollment_service.create_enrollment(
            db_session,
            org_id,
            EnrollmentCreate(
                person_id=person.id,
                class_id=course_class.id,
                status=EnrollmentStatus.active,
            ),
        )
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Person already has a live enrollment for this class"

    enrollment_service.update_status(
        db_session,
        org_id,
        first.id,
        EnrollmentUpdate(status=EnrollmentStatus.dropped),
    )

    second = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            status=EnrollmentStatus.active,
        ),
    )
    assert second.id != first.id
    assert second.status == EnrollmentStatus.active


def test_invalid_foreign_key(
    db_session: Session,
    org_id: int,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")

    with pytest.raises(HTTPException) as exc_info:
        enrollment_service.create_enrollment(
            db_session,
            org_id,
            EnrollmentCreate(person_id=999, class_id=course_class.id),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Person not found"


def test_delete_class_removes_class(
    db_session: Session,
    org_id: int,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")

    class_service.delete_class(db_session, org_id, course_class.id)

    with pytest.raises(HTTPException) as exc_info:
        class_service.get_class(db_session, org_id, course_class.id)
    assert exc_info.value.status_code == 404


def test_delete_class_blocked_by_active_enrollment(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            status=EnrollmentStatus.active,
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        class_service.delete_class(db_session, org_id, course_class.id)

    assert exc_info.value.status_code == 422
    # Class must still exist — nothing was deleted.
    assert class_service.get_class(db_session, org_id, course_class.id) is not None
