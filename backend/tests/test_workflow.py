"""Consultation outcome routing tests."""

from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.consultation import service as consultation_service
from app.consultation.enums import ConsultationOutcome
from app.consultation.model import Consultation
from app.consultation.schemas import ConsultationCreate
from app.course.model import Course
from app.department.model import Department
from app.enrollment import service as enrollment_service
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.schemas import EnrollmentCreate
from app.finance import service as finance_service
from app.finance.enums import InstallmentStatus
from app.finance.schemas import InstallmentPlanItem, InvoiceCreate
from app.journey import service as journey_service
from app.journey.enums import JourneyStatus
from app.person.model import Person
from app.task import service as task_service
from app.task.enums import TaskStatus, TaskType
from app.user.model import User
from app.workflow import service as workflow_service


def _create_consultation(
    db_session: Session,
    org_id: int,
    person: Person,
    department: Department,
    admin_user: User,
    **kwargs: object,
) -> Consultation:
    return consultation_service.create_consultation(
        db_session,
        org_id,
        ConsultationCreate(
            person_id=person.id,
            department_id=department.id,
            consultant_id=admin_user.id,
            **kwargs,
        ),
    )


def _consultation_done_activities(
    db_session: Session,
    org_id: int,
    person_id: int,
    consultation_id: int,
) -> list:
    activities = activity_service.list_activities(
        db_session, org_id, person_id=person_id
    )
    return [
        activity
        for activity in activities
        if activity.action == "consultation_done"
        and activity.payload.get("consultation_id") == consultation_id
    ]


def test_consultation_outcome_pre_enroll(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    department: Department,
    course: Course,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    consultation = _create_consultation(
        db_session,
        org_id,
        person,
        department,
        admin_user,
        recommended_course_id=course.id,
    )

    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        consultation.id,
        ConsultationOutcome.pre_enroll,
        class_id=course_class.id,
        actor_id=admin_user.id,
    )

    enrollments = enrollment_service.list_enrollments(db_session, org_id)
    assert len(enrollments) == 1
    enrollment = enrollments[0]
    assert enrollment.person_id == person.id
    assert enrollment.class_id == course_class.id
    assert enrollment.consultation_id == consultation.id
    assert enrollment.status == EnrollmentStatus.pre_enroll

    invoices = finance_service.list_invoices(db_session, org_id)
    assert len(invoices) == 1
    invoice = invoices[0]
    assert invoice.enrollment_id == enrollment.id
    assert invoice.total_amount == enrollment.final_amount

    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    assert len(installments) == 2
    assert sum(i.amount for i in installments) == invoice.total_amount

    done_activities = _consultation_done_activities(
        db_session, org_id, person.id, consultation.id
    )
    assert len(done_activities) == 1
    assert done_activities[0].payload["outcome"] == ConsultationOutcome.pre_enroll.value


def test_consultation_outcome_follow_up(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    department: Department,
) -> None:
    consultation = _create_consultation(
        db_session, org_id, person, department, admin_user
    )

    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        consultation.id,
        ConsultationOutcome.follow_up,
        actor_id=admin_user.id,
    )

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.follow_up_registration
    assert task.person_id == person.id
    assert task.assignee_id == admin_user.id
    assert task.related_entity_type == "consultation"
    assert task.related_entity_id == consultation.id

    done_activities = _consultation_done_activities(
        db_session, org_id, person.id, consultation.id
    )
    assert len(done_activities) == 1
    assert done_activities[0].payload["outcome"] == ConsultationOutcome.follow_up.value


def test_consultation_outcome_refer_other_dept(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    department: Department,
) -> None:
    target_department = Department(
        name="Target Department",
        manager_id=admin_user.id,
        is_active=True,
        org_id=org_id,
    )
    db_session.add(target_department)
    db_session.commit()
    db_session.refresh(target_department)

    consultation = _create_consultation(
        db_session,
        org_id,
        person,
        department,
        admin_user,
        refer_to_department_id=target_department.id,
    )

    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        consultation.id,
        ConsultationOutcome.refer_other_dept,
        actor_id=admin_user.id,
    )

    journeys = journey_service.list_journeys(db_session, org_id)
    target_journeys = [
        j for j in journeys if j.department_id == target_department.id
    ]
    assert len(target_journeys) == 1
    assert target_journeys[0].person_id == person.id

    tasks = task_service.list_tasks(db_session, org_id)
    assert len(tasks) == 1
    task = tasks[0]
    assert task.type == TaskType.referral
    assert task.person_id == person.id
    assert task.assignee_id == target_department.manager_id
    assert task.related_entity_type == "consultation"
    assert task.related_entity_id == consultation.id

    done_activities = _consultation_done_activities(
        db_session, org_id, person.id, consultation.id
    )
    assert len(done_activities) == 1
    assert (
        done_activities[0].payload["outcome"]
        == ConsultationOutcome.refer_other_dept.value
    )


def test_consultation_outcome_not_suitable(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    department: Department,
) -> None:
    consultation = _create_consultation(
        db_session, org_id, person, department, admin_user
    )

    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        consultation.id,
        ConsultationOutcome.not_suitable,
        actor_id=admin_user.id,
    )

    updated = consultation_service.get_consultation(
        db_session, org_id, consultation.id
    )
    assert updated.journey_id is not None

    journey = journey_service.get_journey(db_session, org_id, updated.journey_id)
    assert journey.status == JourneyStatus.completed

    done_activities = _consultation_done_activities(
        db_session, org_id, person.id, consultation.id
    )
    assert len(done_activities) == 1
    assert (
        done_activities[0].payload["outcome"]
        == ConsultationOutcome.not_suitable.value
    )


def test_consultation_outcome_closed(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    department: Department,
) -> None:
    consultation = _create_consultation(
        db_session, org_id, person, department, admin_user
    )

    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        consultation.id,
        ConsultationOutcome.closed,
        actor_id=admin_user.id,
    )

    updated = consultation_service.get_consultation(
        db_session, org_id, consultation.id
    )
    assert updated.journey_id is not None

    journey = journey_service.get_journey(db_session, org_id, updated.journey_id)
    assert journey.status == JourneyStatus.completed

    done_activities = _consultation_done_activities(
        db_session, org_id, person.id, consultation.id
    )
    assert len(done_activities) == 1
    assert done_activities[0].payload["outcome"] == ConsultationOutcome.closed.value


def test_enrollment_drop(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    course: Course,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )

    total = enrollment.final_amount
    first_amount = total // 2
    second_amount = total - first_amount
    today = date.today()
    invoice = finance_service.issue_invoice(
        db_session,
        org_id,
        InvoiceCreate(
            enrollment_id=enrollment.id,
            installments=[
                InstallmentPlanItem(sequence=1, amount=first_amount, due_date=today),
                InstallmentPlanItem(
                    sequence=2,
                    amount=second_amount,
                    due_date=today + timedelta(days=30),
                ),
            ],
        ),
    )
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    partial_amount = first_amount // 2
    finance_service.record_payment(
        db_session, org_id, installments[0].id, partial_amount, admin_user.id
    )

    task_service.create_task(
        db_session,
        org_id,
        person_id=person.id,
        task_type=TaskType.pre_enroll_unpaid,
        title="Pre-enroll follow-up",
        due_date=today + timedelta(days=7),
        related_entity_type="enrollment",
        related_entity_id=enrollment.id,
        actor_id=admin_user.id,
    )

    dropped = enrollment_service.drop_enrollment(
        db_session,
        org_id,
        enrollment.id,
        "Student withdrew",
        admin_user.id,
        notes="Requested refund",
    )

    assert dropped.status == EnrollmentStatus.dropped

    refreshed_installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    assert all(i.status == InstallmentStatus.cancelled for i in refreshed_installments)

    refunds = finance_service.list_refunds(db_session, org_id)
    assert len(refunds) == 1
    assert refunds[0].amount == partial_amount
    assert refunds[0].reason == "Student withdrew"

    tasks = task_service.list_tasks(db_session, org_id)
    enrollment_tasks = [
        t
        for t in tasks
        if t.related_entity_type == "enrollment"
        and t.related_entity_id == enrollment.id
    ]
    assert len(enrollment_tasks) == 1
    assert enrollment_tasks[0].status == TaskStatus.cancelled

    activities = activity_service.list_activities(
        db_session, org_id, person_id=person.id
    )
    drop_activities = [
        a for a in activities if a.action == "enrollment_dropped"
    ]
    assert len(drop_activities) == 1
    assert drop_activities[0].payload["enrollment_id"] == enrollment.id
    assert drop_activities[0].payload["reason"] == "Student withdrew"
    assert drop_activities[0].payload["notes"] == "Requested refund"
