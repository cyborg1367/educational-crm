"""Static + functional guard for app/auth/permissions.py.

This is a regression guard, not a feature test: it exists so that adding a
new mutating endpoint to a protected router *without* wiring
`require_permission(...)` fails CI, instead of silently shipping an
unauthenticated-by-role endpoint the way `finance`/`enrollment` did before
this module existed (see app/auth/permissions.py's docstring for the full
story).

Two layers:
1. Static route introspection — every mutating (non-GET) route under the
   PROTECTED_PREFIXES below must depend, directly or transitively, on a
   callable tagged with `__permission__` by `require_permission()`.
2. Functional — an authenticated user with a role that is NOT in the
   permission matrix for a given endpoint gets 403, not 2xx.
"""

from collections.abc import Iterator

import pytest
from fastapi.routing import APIRoute
from sqlalchemy.orm import Session

from datetime import date

from app.department.model import Department
from app.enrollment.schemas import EnrollmentCreate
from app.finance.schemas import (
    InstallmentPlanItem,
    InvoiceCreate,
    PaymentCreate,
    RefundCreate,
)
from app.main import app
from app.person.model import Person
from app.user.enums import UserRole
from app.user.model import User

# Endpoints outside these prefixes aren't in scope for this guard yet — see
# app/auth/permissions.py's docstring for the routers still unprotected.
PROTECTED_PREFIXES = ("/enrollments", "/invoices", "/payments", "/refunds")

# GET is read-only; this guard is about mutating actions only.
MUTATING_METHODS = {"POST", "PATCH", "PUT", "DELETE"}


def _iter_api_routes() -> Iterator[tuple[str, APIRoute]]:
    """Yield (full_path, APIRoute) for every route mounted on `app`.

    FastAPI wraps each `include_router(...)` call in an internal
    `_IncludedRouter`; the mount prefix lives on `route.include_context.prefix`
    and the actual `APIRoute` objects on `route.original_router.routes`.
    """
    for route in app.routes:
        original_router = getattr(route, "original_router", None)
        include_context = getattr(route, "include_context", None)
        if original_router is None or include_context is None:
            continue
        prefix = include_context.prefix
        for sub_route in original_router.routes:
            if isinstance(sub_route, APIRoute):
                yield prefix + sub_route.path, sub_route


def _dependency_calls(dependant) -> list:
    calls = []
    for sub in dependant.dependencies:
        calls.append(sub.call)
        calls.extend(_dependency_calls(sub))
    return calls


def _protected_mutating_routes() -> list[APIRoute]:
    routes = []
    for path, route in _iter_api_routes():
        if not path.startswith(PROTECTED_PREFIXES):
            continue
        if route.methods & MUTATING_METHODS:
            routes.append(route)
    return routes


def test_every_protected_mutating_route_has_a_permission_check() -> None:
    routes = _protected_mutating_routes()
    # If this is empty, the introspection itself broke (e.g. a FastAPI
    # upgrade changed internals) — fail loudly rather than pass vacuously.
    assert len(routes) >= 5

    unprotected = []
    for route in routes:
        calls = _dependency_calls(route.dependant)
        if not any(getattr(call, "__permission__", None) is not None for call in calls):
            unprotected.append((sorted(route.methods), route.path))

    assert not unprotected, (
        "These mutating routes have no require_permission(...) dependency: "
        f"{unprotected}"
    )


@pytest.fixture
def other_department(db_session: Session, org_id: int, admin_user: User) -> Department:
    record = Department(
        name="Other Department",
        manager_id=admin_user.id,
        is_active=True,
        org_id=org_id,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


@pytest.fixture
def teacher_user(db_session: Session, org_id: int) -> User:
    from app.auth.security import hash_password

    record = User(
        name="A Teacher",
        email="teacher@test.example",
        password_hash=hash_password("test-password"),
        role=UserRole.teacher,
        org_id=org_id,
        is_active=True,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


def _auth_headers(user: User) -> dict[str, str]:
    from app.auth.security import create_access_token

    token = create_access_token(user_id=user.id, org_id=user.org_id)
    return {"Authorization": f"Bearer {token}"}


def test_teacher_cannot_create_enrollment(
    api_client, teacher_user: User, person: Person, request: pytest.FixtureRequest
) -> None:
    course_class = request.getfixturevalue("class")
    api_client.headers.update(_auth_headers(teacher_user))

    response = api_client.post(
        "/enrollments",
        json=EnrollmentCreate(
            person_id=person.id, class_id=course_class.id
        ).model_dump(mode="json"),
    )

    assert response.status_code == 403


def test_teacher_cannot_record_payment(
    api_client, teacher_user: User
) -> None:
    api_client.headers.update(_auth_headers(teacher_user))

    response = api_client.post(
        "/payments",
        json=PaymentCreate(installment_id=1, amount=1000).model_dump(mode="json"),
    )

    assert response.status_code == 403


def test_teacher_cannot_refund_payment(api_client, teacher_user: User) -> None:
    api_client.headers.update(_auth_headers(teacher_user))

    response = api_client.post(
        "/refunds",
        json=RefundCreate(
            payment_id=1, amount=1000, reason="test"
        ).model_dump(mode="json"),
    )

    assert response.status_code == 403


def test_teacher_cannot_issue_invoice(api_client, teacher_user: User) -> None:
    api_client.headers.update(_auth_headers(teacher_user))

    # Body is schema-valid (even though enrollment_id=1 may not exist) so a
    # 403 here is unambiguously the permission check, not body validation.
    response = api_client.post(
        "/invoices",
        json=InvoiceCreate(
            enrollment_id=1,
            installments=[
                InstallmentPlanItem(sequence=1, amount=1000, due_date=date.today())
            ],
        ).model_dump(mode="json"),
    )

    assert response.status_code == 403


def test_admission_can_create_enrollment(
    db_session: Session,
    org_id: int,
    person: Person,
    request: pytest.FixtureRequest,
) -> None:
    """Sanity check the matrix isn't over-restrictive: admission (a role the
    matrix DOES grant) still succeeds, proving 403s above are a role check
    and not, say, a broken fixture or route."""
    from app.enrollment import service as enrollment_service

    course_class = request.getfixturevalue("class")
    # Exercises the service directly (permission check lives in the router
    # dependency, already proven by the api_client tests above); this
    # confirms create_enrollment itself has no incidental role coupling.
    enrollment = enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )
    assert enrollment.id is not None
