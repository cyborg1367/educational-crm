"""Wipe all business data; keep organization(s) and users with their roles."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Register all ORM models.
from app.activity import model as _activity_model  # noqa: F401
from app.attendance import model as _attendance_model  # noqa: F401
from app.communication import model as _communication_model  # noqa: F401
from app.consultation import model as _consultation_model  # noqa: F401
from app.course import model as _course_model  # noqa: F401
from app.course_class import model as _course_class_model  # noqa: F401
from app.department import model as _department_model  # noqa: F401
from app.enrollment import model as _enrollment_model  # noqa: F401
from app.finance import model as _finance_model  # noqa: F401
from app.journey import model as _journey_model  # noqa: F401
from app.organization import model as _organization_model  # noqa: F401
from app.person import model as _person_model  # noqa: F401
from app.roadmap import model as _roadmap_model  # noqa: F401
from app.task import model as _task_model  # noqa: F401
from app.user import model as _user_model  # noqa: F401

from sqlalchemy import delete, func, select, text, update

from app.core.db import SessionLocal
from app.organization.model import Organization
from app.user.model import User

TABLES_IN_DELETE_ORDER = [
    "attendances",
    "refunds",
    "payments",
    "installments",
    "invoices",
    "enrollments",
    "consultations",
    "journeys",
    "tasks",
    "communications",
    "activities",
    "roadmap_items",
    "roadmaps",
    "course_prerequisites",
    "classes",
    "courses",
    "departments",
    "people",
]

SEQUENCE_TABLES = [
    "people",
    "departments",
    "courses",
    "classes",
    "roadmaps",
    "roadmap_items",
    "journeys",
    "consultations",
    "enrollments",
    "invoices",
    "installments",
    "payments",
    "refunds",
    "attendances",
    "tasks",
    "activities",
    "communications",
    "course_prerequisites",
]


def reset_data() -> None:
    with SessionLocal() as db:
        for table in TABLES_IN_DELETE_ORDER:
            result = db.execute(text(f"DELETE FROM {table}"))
            print(f"  deleted {result.rowcount} rows from {table}")

        cleared = db.execute(
            update(User).values(department_id=None)
        )
        print(f"  cleared department_id on {cleared.rowcount} users")

        for table in SEQUENCE_TABLES:
            db.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), 1, false)"
                )
            )

        org_count = db.scalar(select(func.count()).select_from(Organization)) or 0
        user_count = db.scalar(select(func.count()).select_from(User)) or 0

        db.commit()
        print(f"  kept {org_count} organization(s), {user_count} user(s) with roles")


if __name__ == "__main__":
    print("Resetting business data (keeping users + roles)...")
    reset_data()
    print("Done.")
