"""Scheduled job function tests."""

from datetime import date, datetime, timedelta, timezone

import pytest
from freezegun import freeze_time
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.enrollment import service as enrollment_service
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.schemas import EnrollmentCreate
from app.finance import service as finance_service
from app.finance.schemas import InstallmentPlanItem, InvoiceCreate
from app.journey import service as journey_service
from app.journey.schemas import JourneyCreate
from app.person.enums import PersonStatus
from app.person.model import Person
from app.task import service as task_service
from app.task.enums import TaskType
from app.user.model import User
from app.workflow import jobs


@freeze_time("2026-06-15")
def test_job_pre_enroll_unpaid(
    db_session: Session,
    org_id: int,
    person: Person,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            status=EnrollmentStatus.pre_enroll,
        ),
    )
    enrollment.created_at = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    db_session.commit()

    jobs.job_check_pre_enroll_unpaid(db_session=db_session)
    db_session.commit()

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.pre_enroll_unpaid
    assert task.person_id == person.id
    assert task.assignee_id == admin_user.id
    assert task.related_entity_type == "enrollment"
    assert task.related_entity_id == enrollment.id


@freeze_time("2026-06-15")
def test_job_installment_overdue(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )
    invoice = finance_service.issue_invoice(
        db_session,
        org_id,
        InvoiceCreate(
            enrollment_id=enrollment.id,
            installments=[
                InstallmentPlanItem(
                    sequence=1,
                    amount=enrollment.final_amount,
                    due_date=date(2026, 6, 1),
                ),
            ],
        ),
    )
    installment = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )[0]

    jobs.job_check_installment_overdue(db_session=db_session)
    db_session.commit()

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.installment_overdue
    assert task.person_id == person.id
    assert task.related_entity_type == "installment"
    assert task.related_entity_id == installment.id


@freeze_time("2026-06-15")
def test_job_dormant_followup(
    db_session: Session,
    org_id: int,
    person: Person,
    department,
    admin_user: User,
) -> None:
    person.status = PersonStatus.dormant
    db_session.commit()

    journey = journey_service.create_journey(
        db_session,
        org_id,
        JourneyCreate(person_id=person.id, department_id=department.id),
    )

    jobs.job_check_dormant_followup(db_session=db_session)
    db_session.commit()

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.dormant_followup
    assert task.person_id == person.id
    assert task.assignee_id == admin_user.id
    assert task.related_entity_type == "journey"
    assert task.related_entity_id == journey.id


@freeze_time("2026-06-15")
def test_job_class_start_reminder(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    course_class.start_date = date(2026, 6, 16)
    course_class.status = ClassStatus.active
    db_session.commit()

    enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            status=EnrollmentStatus.active,
        ),
    )

    jobs.job_class_start_reminder(db_session=db_session)
    db_session.commit()

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.custom
    assert task.title == "Class starts tomorrow"
    assert task.person_id == person.id
    assert task.related_entity_type == "class"
    assert task.related_entity_id == course_class.id


@freeze_time("2026-06-15")
def test_job_archive_inactive_journeys(
    db_session: Session,
    org_id: int,
    person: Person,
    department,
    admin_user: User,
) -> None:
    journey = journey_service.create_journey(
        db_session,
        org_id,
        JourneyCreate(person_id=person.id, department_id=department.id),
    )
    activity = activity_service.log_activity(
        db_session,
        org_id,
        person.id,
        "test_touch",
        payload={"note": "old"},
    )
    activity.created_at = datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    db_session.commit()

    jobs.job_archive_inactive_journeys(db_session=db_session)
    db_session.commit()

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.custom
    assert task.title == "Review inactive journey"
    assert task.person_id == person.id
    assert task.assignee_id == admin_user.id
    assert task.related_entity_type == "journey"
    assert task.related_entity_id == journey.id
