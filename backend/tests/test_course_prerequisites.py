"""Course prerequisites, duration auto-calc, department roadmap, and auto sync."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.errors import ValidationError
from app.course import service as course_service
from app.course.schemas import CourseCreate, CourseUpdate
from app.department.model import Department
from app.journey.enums import JourneyStatus
from app.journey.model import Journey
from app.journey.schemas import JourneyCreate
from app.journey import service as journey_service
from app.person.model import Person
from app.roadmap import service as roadmap_service
from app.roadmap.model import Roadmap, RoadmapItem
from app.roadmap.schemas import RoadmapCreate, RoadmapItemCreate


def test_duration_sessions_auto_calculated_on_create(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    created = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Schedule Course",
            current_price=1_000_000,
            total_hours=48,
            session_duration=1.5,
        ),
    )
    assert created.duration_sessions == 32


def test_duration_sessions_auto_calculated_on_update(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    created = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Schedule Course",
            current_price=1_000_000,
        ),
    )
    updated = course_service.update_course(
        db_session,
        org_id,
        created.id,
        CourseUpdate(total_hours=30, session_duration=2),
    )
    assert updated.duration_sessions == 15


def test_prerequisites_saved_same_department(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    base = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Foundation",
            current_price=1_000_000,
        ),
    )
    advanced = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Advanced",
            current_price=2_000_000,
            prerequisite_ids=[base.id],
        ),
    )
    assert [p.id for p in advanced.prerequisites] == [base.id]


def test_prerequisite_self_reference_rejected(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    course = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Solo",
            current_price=1_000_000,
        ),
    )
    with pytest.raises(ValidationError):
        course_service.update_course(
            db_session,
            org_id,
            course.id,
            CourseUpdate(prerequisite_ids=[course.id]),
        )


def test_get_department_roadmap_returns_active_courses(
    api_client: TestClient,
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    base = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Foundation",
            current_price=1_000_000,
        ),
    )
    course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Advanced",
            current_price=2_000_000,
            prerequisite_ids=[base.id],
            is_active=True,
        ),
    )
    course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Inactive",
            current_price=500_000,
            is_active=False,
        ),
    )

    response = api_client.get(f"/departments/{department.id}/roadmap")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["courses"]) == 2
    titles = {course["title"] for course in payload["courses"]}
    assert titles == {"Foundation", "Advanced"}
    advanced = next(
        course for course in payload["courses"] if course["title"] == "Advanced"
    )
    assert advanced["prerequisite_ids"] == [base.id]


def test_course_create_syncs_department_roadmap_items(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    base = course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Foundation",
            current_price=1_000_000,
        ),
    )
    course_service.create_course(
        db_session,
        org_id,
        CourseCreate(
            department_id=department.id,
            title="Advanced",
            current_price=2_000_000,
            prerequisite_ids=[base.id],
        ),
    )

    roadmap = roadmap_service.get_roadmap_for_department(
        db_session, org_id, department.id
    )
    assert roadmap is not None
    assert roadmap.name == department.name

    items, total = roadmap_service.list_roadmap_items(
        db_session, org_id, roadmap.id, limit=10
    )
    assert total == 2
    assert [item.title for item in items] == ["Foundation", "Advanced"]
    assert [item.course_id for item in items] == [base.id, items[1].course_id]
    assert items[0].sequence == 1
    assert items[1].sequence == 2


def test_manual_roadmap_create_is_rejected(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    with pytest.raises(ValidationError):
        roadmap_service.create_roadmap(
            db_session,
            org_id,
            RoadmapCreate(department_id=department.id, name="Manual"),
        )


def test_manual_roadmap_item_create_is_rejected(
    db_session: Session,
    org_id: int,
    department: Department,
) -> None:
    roadmap = roadmap_service.sync_department_roadmap(
        db_session, org_id, department.id
    )
    db_session.commit()

    with pytest.raises(ValidationError):
        roadmap_service.create_roadmap_item(
            db_session,
            org_id,
            roadmap.id,
            RoadmapItemCreate(title="Step 1", sequence=1),
        )


def test_journey_auto_assigns_department_roadmap(
    db_session: Session,
    org_id: int,
    department: Department,
    person: Person,
) -> None:
    roadmap = roadmap_service.sync_department_roadmap(
        db_session, org_id, department.id
    )
    db_session.commit()

    journey = journey_service.create_journey(
        db_session,
        org_id,
        JourneyCreate(
            person_id=person.id,
            department_id=department.id,
            status=JourneyStatus.active,
        ),
    )
    assert journey.roadmap_id == roadmap.id
