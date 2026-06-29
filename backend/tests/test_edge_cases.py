"""Edge-case and validation tests across core domains."""

from datetime import date, timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.orm import Session

from app.attendance import service as attendance_service
from app.attendance.schemas import AttendanceCreate
from app.communication.enums import CommunicationChannel, CommunicationDirection
from app.consultation import service as consultation_service
from app.consultation.enums import ConsultationOutcome
from app.consultation.schemas import ConsultationCreate
from app.course.schemas import CourseCreate
from app.course_class.model import CourseClass
from app.department import service as department_service
from app.department.model import Department
from app.department.schemas import DepartmentCreate
from app.enrollment import service as enrollment_service
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.schemas import EnrollmentCreate
from app.finance import service as finance_service
from app.finance.schemas import InstallmentPlanItem, InvoiceCreate
from app.person import service as person_service
from app.person.enums import PersonStatus
from app.person.model import Person
from app.person.schemas import PersonCreate
from app.roadmap import service as roadmap_service
from app.roadmap.schemas import RoadmapCreate, RoadmapItemCreate
from app.task import service as task_service
from app.task.enums import TaskStatus, TaskType
from app.task.schemas import TaskCreate, TaskUpdate
from app.user.enums import UserRole
from app.user.model import User
from app.workflow import service as workflow_service


# --- Person ---


def test_person_phone_nullable(db_session: Session, org_id: int) -> None:
    created = person_service.create_person(
        db_session,
        org_id,
        PersonCreate(full_name="No Phone Person", phone=None),
    )
    assert created.phone is None
    assert created.full_name == "No Phone Person"


def test_person_status_transitions(
    db_session: Session,
    org_id: int,
    admin_user: User,
    person: Person,
    department: Department,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    assert person.status == PersonStatus.prospect

    consultation = consultation_service.create_consultation(
        db_session,
        org_id,
        ConsultationCreate(
            person_id=person.id,
            department_id=department.id,
            consultant_id=admin_user.id,
        ),
    )
    workflow_service.on_consultation_outcome(
        db_session,
        org_id,
        consultation.id,
        ConsultationOutcome.follow_up,
        actor_id=admin_user.id,
    )
    db_session.refresh(person)
    assert person.status == PersonStatus.lead

    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            status=EnrollmentStatus.pre_enroll,
        ),
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
                    due_date=date.today(),
                ),
            ],
        ),
    )
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    finance_service.record_payment(
        db_session,
        org_id,
        installments[0].id,
        enrollment.final_amount,
        admin_user.id,
    )

    db_session.refresh(person)
    db_session.refresh(enrollment)
    assert person.status == PersonStatus.student
    assert enrollment.status == EnrollmentStatus.active


def test_person_invalid_name(api_client: TestClient) -> None:
    response = api_client.post("/people", json={"full_name": "", "phone": "09121111111"})
    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"


# --- Enrollment ---


def test_enrollment_without_discount(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(
            person_id=person.id,
            class_id=course_class.id,
            discount_snapshot=0,
        ),
    )
    assert enrollment.discount_snapshot == 0
    assert enrollment.final_amount == enrollment.price_snapshot


def test_enrollment_invalid_status(
    api_client: TestClient,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    response = api_client.post(
        "/enrollments",
        json={
            "person_id": person.id,
            "class_id": course_class.id,
            "status": "not_a_real_status",
        },
    )
    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"


# --- Course ---


def test_course_price_zero(
    api_client: TestClient,
    department: Department,
) -> None:
    with pytest.raises(PydanticValidationError):
        CourseCreate(
            department_id=department.id,
            title="Free Course",
            current_price=0,
        )

    response = api_client.post(
        "/courses",
        json={
            "department_id": department.id,
            "title": "Free Course",
            "current_price": 0,
        },
    )
    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"


def test_course_price_negative(
    api_client: TestClient,
    department: Department,
) -> None:
    with pytest.raises(PydanticValidationError):
        CourseCreate(
            department_id=department.id,
            title="Bad Course",
            current_price=-100,
        )

    response = api_client.post(
        "/courses",
        json={
            "department_id": department.id,
            "title": "Bad Course",
            "current_price": -100,
        },
    )
    assert response.status_code == 422
    assert response.json()["error_code"] == "VALIDATION_ERROR"


# --- Department / Roadmap ---


def test_department_without_manager(db_session: Session, org_id: int) -> None:
    department = department_service.create_department(
        db_session,
        org_id,
        DepartmentCreate(name="Unmanaged Department", manager_id=None),
    )
    assert department.manager_id is None
    assert department.name == "Unmanaged Department"


def test_roadmap_items_order(
    db_session: Session,
    org_id: int,
    department: Department,
    course,
) -> None:
    roadmap = roadmap_service.create_roadmap(
        db_session,
        org_id,
        RoadmapCreate(department_id=department.id, name="Learning Path"),
    )
    roadmap_service.create_roadmap_item(
        db_session,
        org_id,
        roadmap.id,
        RoadmapItemCreate(title="Step C", sequence=2, course_id=course.id),
    )
    roadmap_service.create_roadmap_item(
        db_session,
        org_id,
        roadmap.id,
        RoadmapItemCreate(title="Step A", sequence=0),
    )
    roadmap_service.create_roadmap_item(
        db_session,
        org_id,
        roadmap.id,
        RoadmapItemCreate(title="Step B", sequence=1),
    )

    items, total = roadmap_service.list_roadmap_items(
        db_session, org_id, roadmap.id, limit=10
    )
    assert total == 3
    assert [item.sequence for item in items] == [0, 1, 2]
    assert [item.title for item in items] == ["Step A", "Step B", "Step C"]


# --- Communication (append-only) ---


def _create_communication(api_client: TestClient, person_id: int) -> int:
    response = api_client.post(
        "/communications",
        json={
            "person_id": person_id,
            "channel": CommunicationChannel.phone.value,
            "direction": CommunicationDirection.outbound.value,
            "content": "Follow-up call",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_communication_no_update(api_client: TestClient, person: Person) -> None:
    _create_communication(api_client, person.id)
    response = api_client.patch(
        "/communications",
        json={"person_id": person.id, "content": "Changed"},
    )
    assert response.status_code == 405


def test_communication_no_delete(api_client: TestClient, person: Person) -> None:
    _create_communication(api_client, person.id)
    response = api_client.delete("/communications")
    assert response.status_code == 405


# --- Activity (append-only) ---


def _create_activity(api_client: TestClient, person_id: int) -> int:
    response = api_client.post(
        "/activities",
        json={
            "person_id": person_id,
            "action": "note_added",
            "payload": {"text": "Test note"},
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_activity_immutable(api_client: TestClient, person: Person) -> None:
    _create_activity(api_client, person.id)
    response = api_client.patch(
        "/activities",
        json={"person_id": person.id, "action": "tampered"},
    )
    assert response.status_code == 405


# --- Task ---


def test_task_completion(
    db_session: Session,
    org_id: int,
    person: Person,
    admin_user: User,
) -> None:
    task = task_service.create_task_from_schema(
        db_session,
        org_id,
        TaskCreate(
            person_id=person.id,
            type=TaskType.custom,
            title="Complete me",
            due_date=date.today() + timedelta(days=1),
            assignee_id=admin_user.id,
        ),
        actor_id=admin_user.id,
    )
    assert task.status == TaskStatus.open
    assert task.completed_at is None

    completed = task_service.complete_task(db_session, org_id, task.id)
    assert completed.status == TaskStatus.done
    assert completed.completed_at is not None


def test_task_reassign(
    db_session: Session,
    org_id: int,
    person: Person,
    admin_user: User,
) -> None:
    other_user = User(
        name="Other Staff",
        email="other@test.example",
        password_hash="hash",
        role=UserRole.admission,
        org_id=org_id,
        is_active=True,
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    task = task_service.create_task_from_schema(
        db_session,
        org_id,
        TaskCreate(
            person_id=person.id,
            type=TaskType.custom,
            title="Reassign me",
            due_date=date.today() + timedelta(days=2),
            assignee_id=admin_user.id,
        ),
        actor_id=admin_user.id,
    )
    assert task.assignee_id == admin_user.id

    updated = task_service.update_task(
        db_session,
        org_id,
        task.id,
        TaskUpdate(assignee_id=other_user.id),
    )
    assert updated.assignee_id == other_user.id


# --- Attendance ---


def test_attendance_duplicate_session(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )
    session_date = date(2026, 2, 10)
    attendance_service.create_attendance(
        db_session,
        org_id,
        AttendanceCreate(
            enrollment_id=enrollment.id,
            session_date=session_date,
            present=True,
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        attendance_service.create_attendance(
            db_session,
            org_id,
            AttendanceCreate(
                enrollment_id=enrollment.id,
                session_date=session_date,
                present=False,
            ),
        )
    assert exc_info.value.status_code == 409
    assert (
        exc_info.value.detail
        == "Attendance already recorded for this enrollment and session date"
    )


def test_attendance_invalid_date(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    course_class: CourseClass = request.getfixturevalue("class")
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )

    with pytest.raises(HTTPException) as exc_info:
        attendance_service.create_attendance(
            db_session,
            org_id,
            AttendanceCreate(
                enrollment_id=enrollment.id,
                session_date=date.today() + timedelta(days=1),
                present=True,
            ),
        )
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "session_date cannot be in the future"
