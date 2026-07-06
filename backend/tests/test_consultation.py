"""Consultation list filters and RBAC tests."""

import pytest
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.consultation import service as consultation_service
from app.consultation.schemas import ConsultationCreate, ConsultationUpdate
from app.core.errors import PermissionError
from app.department.model import Department
from app.person.model import Person
from app.user.enums import UserRole
from app.user.model import User


@pytest.fixture
def dept_manager_user(db_session: Session, org_id: int) -> User:
    user = User(
        name="Dept Manager",
        email="manager@test.example",
        password_hash=hash_password("test-password"),
        role=UserRole.department_manager,
        org_id=org_id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def managed_department(
    db_session: Session, org_id: int, dept_manager_user: User
) -> Department:
    record = Department(
        name="Managed Department",
        manager_id=dept_manager_user.id,
        is_active=True,
        org_id=org_id,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


def test_list_consultations_pending_filter(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    managed_department: Department,
    dept_manager_user: User,
) -> None:
    pending = consultation_service.create_consultation(
        db_session,
        org_id,
        ConsultationCreate(
            person_id=person.id,
            department_id=managed_department.id,
        ),
        actor_id=admin_user.id,
    )
    from app.workflow import service as workflow_service
    from app.consultation.enums import ConsultationOutcome

    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        pending.id,
        ConsultationOutcome.closed,
        actor_id=dept_manager_user.id,
        actor=dept_manager_user,
    )

    open_consultation = consultation_service.create_consultation(
        db_session,
        org_id,
        ConsultationCreate(
            person_id=person.id,
            department_id=managed_department.id,
        ),
        actor_id=admin_user.id,
    )

    pending_items, pending_count = consultation_service.list_consultations(
        db_session,
        org_id,
        consultant_id=dept_manager_user.id,
        pending=True,
    )
    assert pending_count == 1
    assert pending_items[0].id == open_consultation.id


def test_update_consultation_rbac_denies_non_consultant(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    managed_department: Department,
    dept_manager_user: User,
) -> None:
    other_manager = User(
        name="Other Manager",
        email="other-manager@test.example",
        password_hash=hash_password("test-password"),
        role=UserRole.department_manager,
        org_id=org_id,
        is_active=True,
    )
    db_session.add(other_manager)
    db_session.commit()
    db_session.refresh(other_manager)

    consultation = consultation_service.create_consultation(
        db_session,
        org_id,
        ConsultationCreate(
            person_id=person.id,
            department_id=managed_department.id,
        ),
        actor_id=admin_user.id,
    )

    with pytest.raises(PermissionError):
        consultation_service.update_consultation(
            db_session,
            org_id,
            consultation.id,
            ConsultationUpdate(goal="Blocked"),
            actor=other_manager,
        )


def test_update_consultation_logs_assessment_activity(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    managed_department: Department,
    dept_manager_user: User,
) -> None:
    from app.activity import service as activity_service

    consultation = consultation_service.create_consultation(
        db_session,
        org_id,
        ConsultationCreate(
            person_id=person.id,
            department_id=managed_department.id,
        ),
        actor_id=admin_user.id,
    )

    consultation_service.update_consultation(
        db_session,
        org_id,
        consultation.id,
        ConsultationUpdate(current_level="A2", goal="IELTS"),
        actor=dept_manager_user,
    )

    activities, _ = activity_service.list_activities(
        db_session, org_id, person_id=person.id
    )
    saved = [
        activity
        for activity in activities
        if activity.action == "consultation_assessment_saved"
    ]
    assert len(saved) == 1
    assert saved[0].payload["consultation_id"] == consultation.id
