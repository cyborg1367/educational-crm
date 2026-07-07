"""Root pytest fixtures — in-memory SQLite DB and standard test entities."""

from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import JSON, Index, create_engine, event, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.activity import model as activity_model  # noqa: F401
from app.attendance import model as attendance_model  # noqa: F401
from app.auth.security import create_access_token, hash_password
from app.communication import model as communication_model  # noqa: F401
from app.consultation import model as consultation_model  # noqa: F401
from app.core.db import Base, get_db
from app.course import model as course_model  # noqa: F401
from app.course.model import Course
from app.course_class import model as course_class_model  # noqa: F401
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.department import model as department_model  # noqa: F401
from app.department.model import Department
from app.enrollment import model as enrollment_model  # noqa: F401
from app.enrollment.model import Enrollment
from app.finance import model as finance_model  # noqa: F401
from app.journey import model as journey_model  # noqa: F401
from app.main import app
from app.organization import model as organization_model  # noqa: F401
from app.organization.model import Organization
from app.person import model as person_model  # noqa: F401
from app.person.enums import PersonStatus
from app.person.model import Person
from app.roadmap import model as roadmap_model  # noqa: F401
from app.task import model as task_model  # noqa: F401
from app.user import model as user_model  # noqa: F401
from app.user.enums import UserRole
from app.user.model import User


def _adapt_metadata_for_sqlite() -> None:
    """Swap PostgreSQL-only column types so create_all works on SQLite."""
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, JSONB):
                column.type = JSON()

    enrollments = Enrollment.__table__
    for idx in list(enrollments.indexes):
        if idx.name == "uq_enrollments_person_class_live":
            enrollments.indexes.discard(idx)
            Index(
                idx.name,
                enrollments.c.person_id,
                enrollments.c.class_id,
                unique=True,
                sqlite_where=text("status != 'dropped'"),
            )


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """In-memory SQLite session with all tables created."""
    _adapt_metadata_for_sqlite()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fks(dbapi_connection, connection_record) -> None:  # noqa: ARG001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def org_id(db_session: Session) -> int:
    """Test organization with id 1."""
    org = Organization(id=1, name="Test Org", is_active=True)
    db_session.add(org)
    db_session.commit()
    return org.id


@pytest.fixture
def admin_user(db_session: Session, org_id: int) -> User:
    """Admin user in the test org."""
    user = User(
        name="Test Admin",
        email="admin@test.example",
        password_hash=hash_password("test-password"),
        role=UserRole.admin,
        org_id=org_id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def person(db_session: Session, org_id: int) -> Person:
    """Standard test person in the test org."""
    record = Person(
        full_name="Test Person",
        phone="09120000000",
        email="person@test.example",
        status=PersonStatus.prospect,
        org_id=org_id,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


@pytest.fixture
def department(db_session: Session, org_id: int, admin_user: User) -> Department:
    """Standard test department in the test org."""
    record = Department(
        name="Test Department",
        manager_id=admin_user.id,
        is_active=True,
        org_id=org_id,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


@pytest.fixture
def course(db_session: Session, org_id: int, department: Department) -> Course:
    """Standard test course in the test org."""
    record = Course(
        department_id=department.id,
        title="Test Course",
        description="A course for tests",
        current_price=5_000_000,
        duration_sessions=12,
        is_active=True,
        org_id=org_id,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


@pytest.fixture(name="class")
def course_class(
    db_session: Session,
    org_id: int,
    course: Course,
    admin_user: User,
) -> CourseClass:
    """Standard test class in the test org."""
    record = CourseClass(
        course_id=course.id,
        teacher_id=admin_user.id,
        name="Test Class",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 6, 1),
        status=ClassStatus.planned,
        org_id=org_id,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


@pytest.fixture
def api_client(
    db_session: Session, admin_user: User
) -> Generator[TestClient, None, None]:
    """Authenticated TestClient with DB override."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    token = create_access_token(user_id=admin_user.id, org_id=admin_user.org_id)
    headers = {"Authorization": f"Bearer {token}"}

    with TestClient(app) as client:
        client.headers.update(headers)
        yield client

    app.dependency_overrides.clear()
