"""Scheduled background jobs — plain functions invoked by APScheduler."""

from __future__ import annotations

import time as time_module
from contextlib import contextmanager
from datetime import date, datetime, time, timedelta, timezone
from typing import Generator

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.activity.model import Activity
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.logging_config import get_logger
from app.course.model import Course
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.department.model import Department
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.model import Enrollment
from app.finance.enums import InstallmentStatus
from app.finance.model import Installment, Invoice
from app.finance.service import recompute_installment_status
from app.journey.enums import JourneyStatus
from app.journey.model import Journey
from app.notifications import service as notifications_service
from app.organization.model import Organization
from app.person.enums import PersonStatus
from app.person.model import Person
from app.task import service as task_service
from app.task.enums import TaskType
from app.tenancy.scoping import scoped

DORMANT_INACTIVITY_DAYS = 30
INACTIVE_JOURNEY_DAYS = 60

logger = get_logger(__name__)


@contextmanager
def _job_session(db_session: Session | None) -> Generator[Session, None, None]:
    own_session = db_session is None
    db = db_session if db_session is not None else SessionLocal()
    try:
        yield db
        if own_session:
            db.commit()
    except Exception:
        if own_session:
            db.rollback()
        raise
    finally:
        if own_session:
            db.close()


def _today() -> date:
    return date.today()


def _enrollment_paid_total(db: Session, org_id: int, enrollment_id: int) -> int:
    stmt = (
        select(func.coalesce(func.sum(Installment.paid_amount), 0))
        .select_from(Installment)
        .join(Invoice, Installment.invoice_id == Invoice.id)
        .where(Invoice.enrollment_id == enrollment_id, Invoice.org_id == org_id)
    )
    return int(db.scalar(stmt) or 0)


def _department_manager_for_enrollment(
    db: Session, org_id: int, enrollment: Enrollment
) -> int | None:
    stmt = (
        select(Department.manager_id)
        .join(Course, Course.department_id == Department.id)
        .join(CourseClass, CourseClass.course_id == Course.id)
        .where(
            CourseClass.id == enrollment.class_id,
            CourseClass.org_id == org_id,
            Department.org_id == org_id,
        )
    )
    return db.scalar(stmt)


def _last_activity_by_person(
    db: Session, org_id: int
) -> dict[int, datetime]:
    stmt = (
        select(Activity.person_id, func.max(Activity.created_at))
        .where(Activity.org_id == org_id)
        .group_by(Activity.person_id)
    )
    return {person_id: last_at for person_id, last_at in db.execute(stmt).all()}


def _inactive_since(last_at: datetime | None, cutoff_date: date) -> bool:
    if last_at is None:
        return True
    return last_at.date() <= cutoff_date


def _journey_manager_id(db: Session, org_id: int, journey: Journey) -> int | None:
    stmt = scoped(select(Department.manager_id), Department, org_id).where(
        Department.id == journey.department_id
    )
    return db.scalar(stmt)


def job_check_pre_enroll_unpaid(db_session: Session | None = None) -> None:
    job_name = "job_check_pre_enroll_unpaid"
    start = time_module.perf_counter()
    created_tasks = 0
    today = _today()
    cutoff = datetime.combine(
        today - timedelta(days=settings.PRE_ENROLL_FOLLOWUP_DAYS),
        time.min,
        tzinfo=timezone.utc,
    )

    with _job_session(db_session) as db:
        org_ids = list(db.scalars(select(Organization.id)).all())
        for org_id in org_ids:
            stmt = scoped(select(Enrollment), Enrollment, org_id).where(
                Enrollment.status == EnrollmentStatus.pre_enroll,
                Enrollment.created_at < cutoff,
            )
            for enrollment in db.scalars(stmt).all():
                if _enrollment_paid_total(db, org_id, enrollment.id) != 0:
                    continue
                manager_id = _department_manager_for_enrollment(
                    db, org_id, enrollment
                )
                task_service.create_task(
                    db,
                    org_id,
                    person_id=enrollment.person_id,
                    task_type=TaskType.pre_enroll_unpaid,
                    title="Pre-enrollment unpaid follow-up",
                    due_date=today,
                    assignee_id=manager_id,
                    related_entity_type="enrollment",
                    related_entity_id=enrollment.id,
                )
                notifications_service.notify_pre_enroll_unpaid(
                    db,
                    org_id,
                    enrollment.person_id,
                    settings.PRE_ENROLL_FOLLOWUP_DAYS,
                )
                created_tasks += 1

    duration_ms = round((time_module.perf_counter() - start) * 1000, 2)
    logger.info(
        "job_completed",
        extra={
            "event": "job_execution",
            "job_name": job_name,
            "created_tasks": created_tasks,
            "duration_ms": duration_ms,
        },
    )


def job_check_installment_overdue(db_session: Session | None = None) -> None:
    job_name = "job_check_installment_overdue"
    start = time_module.perf_counter()
    created_tasks = 0
    today = _today()

    with _job_session(db_session) as db:
        org_ids = list(db.scalars(select(Organization.id)).all())
        for org_id in org_ids:
            stmt = scoped(select(Installment), Installment, org_id).where(
                Installment.due_date < today,
                Installment.paid_amount < Installment.amount,
                Installment.status.not_in(
                    [InstallmentStatus.paid, InstallmentStatus.cancelled]
                ),
            )
            for installment in db.scalars(stmt).all():
                recompute_installment_status(installment)
                invoice = installment.invoice
                enrollment = invoice.enrollment
                task_service.create_task(
                    db,
                    org_id,
                    person_id=enrollment.person_id,
                    task_type=TaskType.installment_overdue,
                    title="Overdue installment",
                    due_date=today,
                    related_entity_type="installment",
                    related_entity_id=installment.id,
                )
                notifications_service.notify_overdue_installment(
                    db,
                    org_id,
                    enrollment.person_id,
                    installment.id,
                    installment.due_date,
                )
                created_tasks += 1

    duration_ms = round((time_module.perf_counter() - start) * 1000, 2)
    logger.info(
        "job_completed",
        extra={
            "event": "job_execution",
            "job_name": job_name,
            "created_tasks": created_tasks,
            "duration_ms": duration_ms,
        },
    )


def job_check_dormant_followup(db_session: Session | None = None) -> None:
    job_name = "job_check_dormant_followup"
    start = time_module.perf_counter()
    created_tasks = 0
    today = _today()
    inactivity_cutoff_date = today - timedelta(days=DORMANT_INACTIVITY_DAYS)

    with _job_session(db_session) as db:
        org_ids = list(db.scalars(select(Organization.id)).all())
        for org_id in org_ids:
            last_activity = _last_activity_by_person(db, org_id)
            stmt = scoped(select(Person), Person, org_id)
            for person in db.scalars(stmt).all():
                is_dormant = person.status == PersonStatus.dormant
                last_at = last_activity.get(person.id)
                inactive = _inactive_since(last_at, inactivity_cutoff_date)
                if not is_dormant and not inactive:
                    continue

                journey_stmt = (
                    scoped(select(Journey), Journey, org_id)
                    .where(
                        Journey.person_id == person.id,
                        Journey.status == JourneyStatus.active,
                    )
                    .order_by(Journey.id)
                    .limit(1)
                )
                journey = db.scalars(journey_stmt).first()
                assignee_id = (
                    _journey_manager_id(db, org_id, journey) if journey else None
                )
                task_service.create_task(
                    db,
                    org_id,
                    person_id=person.id,
                    task_type=TaskType.dormant_followup,
                    title="Dormant follow-up",
                    due_date=today,
                    assignee_id=assignee_id,
                    related_entity_type="journey" if journey else None,
                    related_entity_id=journey.id if journey else None,
                )
                created_tasks += 1

    duration_ms = round((time_module.perf_counter() - start) * 1000, 2)
    logger.info(
        "job_completed",
        extra={
            "event": "job_execution",
            "job_name": job_name,
            "created_tasks": created_tasks,
            "duration_ms": duration_ms,
        },
    )


def job_class_start_reminder(db_session: Session | None = None) -> None:
    job_name = "job_class_start_reminder"
    start = time_module.perf_counter()
    created_tasks = 0
    today = _today()
    tomorrow = today + timedelta(days=1)

    with _job_session(db_session) as db:
        org_ids = list(db.scalars(select(Organization.id)).all())
        for org_id in org_ids:
            class_stmt = scoped(select(CourseClass), CourseClass, org_id).where(
                CourseClass.start_date == tomorrow,
                CourseClass.status == ClassStatus.active,
            )
            for course_class in db.scalars(class_stmt).all():
                enrollment_stmt = scoped(select(Enrollment), Enrollment, org_id).where(
                    Enrollment.class_id == course_class.id,
                    Enrollment.status == EnrollmentStatus.active,
                )
                for enrollment in db.scalars(enrollment_stmt).all():
                    task_service.create_task(
                        db,
                        org_id,
                        person_id=enrollment.person_id,
                        task_type=TaskType.custom,
                        title="Class starts tomorrow",
                        due_date=today,
                        related_entity_type="class",
                        related_entity_id=course_class.id,
                    )
                    notifications_service.notify_class_starts_tomorrow(
                        db,
                        org_id,
                        enrollment.person_id,
                        course_class.name,
                    )
                    created_tasks += 1

    duration_ms = round((time_module.perf_counter() - start) * 1000, 2)
    logger.info(
        "job_completed",
        extra={
            "event": "job_execution",
            "job_name": job_name,
            "created_tasks": created_tasks,
            "duration_ms": duration_ms,
        },
    )


def job_archive_inactive_journeys(db_session: Session | None = None) -> None:
    job_name = "job_archive_inactive_journeys"
    start = time_module.perf_counter()
    created_tasks = 0
    today = _today()
    inactivity_cutoff_date = today - timedelta(days=INACTIVE_JOURNEY_DAYS)

    with _job_session(db_session) as db:
        org_ids = list(db.scalars(select(Organization.id)).all())
        for org_id in org_ids:
            last_activity = _last_activity_by_person(db, org_id)
            journey_stmt = scoped(select(Journey), Journey, org_id).where(
                Journey.status == JourneyStatus.active,
            )
            for journey in db.scalars(journey_stmt).all():
                last_at = last_activity.get(journey.person_id)
                if not _inactive_since(last_at, inactivity_cutoff_date):
                    continue
                task_service.create_task(
                    db,
                    org_id,
                    person_id=journey.person_id,
                    task_type=TaskType.custom,
                    title="Review inactive journey",
                    due_date=today,
                    assignee_id=_journey_manager_id(db, org_id, journey),
                    related_entity_type="journey",
                    related_entity_id=journey.id,
                )
                created_tasks += 1

    duration_ms = round((time_module.perf_counter() - start) * 1000, 2)
    logger.info(
        "job_completed",
        extra={
            "event": "job_execution",
            "job_name": job_name,
            "created_tasks": created_tasks,
            "duration_ms": duration_ms,
        },
    )
