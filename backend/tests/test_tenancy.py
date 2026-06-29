"""Organization scoping tests."""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.course_class.model import CourseClass
from app.enrollment import service as enrollment_service
from app.enrollment.schemas import EnrollmentCreate
from app.organization.model import Organization
from app.person import service as person_service
from app.person.model import Person
from app.task import service as task_service
from app.task.enums import TaskType


def _create_second_org(db_session: Session) -> int:
    org = Organization(id=2, name="Other Org", is_active=True)
    db_session.add(org)
    db_session.commit()
    return org.id


def test_person_scoped_by_org(
    db_session: Session,
    org_id: int,
    person: Person,
) -> None:
    other_org_id = _create_second_org(db_session)

    with pytest.raises(HTTPException) as exc_info:
        person_service.get_person(db_session, other_org_id, person.id)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Person not found"


def test_enrollment_scoped_by_org(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    other_org_id = _create_second_org(db_session)

    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )

    with pytest.raises(HTTPException) as exc_info:
        enrollment_service.get_enrollment(db_session, other_org_id, enrollment.id)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Enrollment not found"


def test_task_scoped_by_org(
    db_session: Session,
    org_id: int,
    person: Person,
) -> None:
    other_org_id = _create_second_org(db_session)

    task = task_service.create_task(
        db_session,
        org_id,
        person_id=person.id,
        task_type=TaskType.custom,
        title="Org-scoped task",
        due_date=date.today(),
    )

    other_org_tasks = task_service.list_tasks(db_session, other_org_id)
    assert task.id not in [t.id for t in other_org_tasks]

    with pytest.raises(HTTPException) as exc_info:
        task_service.get_task(db_session, other_org_id, task.id)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Task not found"
