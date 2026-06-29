"""Finance invariant validation and price snapshot tests."""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.course import service as course_service
from app.course.model import Course
from app.course.schemas import CourseUpdate
from app.course_class.model import CourseClass
from app.enrollment import service as enrollment_service
from app.enrollment.model import Enrollment
from app.enrollment.schemas import EnrollmentCreate
from app.finance import service as finance_service
from app.finance.schemas import InstallmentPlanItem, InstallmentUpdate, InvoiceCreate
from app.person.model import Person
from app.user.model import User


def _create_enrollment(
    db_session: Session,
    org_id: int,
    person: Person,
    course_class: CourseClass,
) -> Enrollment:
    return enrollment_service.create_enrollment(
        db_session,
        org_id,
        EnrollmentCreate(person_id=person.id, class_id=course_class.id),
    )


def test_finance_invariant_valid(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    course.current_price = 10_000_000
    db_session.commit()

    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    assert enrollment.final_amount == 10_000_000

    invoice = finance_service.issue_invoice(
        db_session,
        org_id,
        InvoiceCreate(
            enrollment_id=enrollment.id,
            installments=[
                InstallmentPlanItem(sequence=1, amount=5_000_000, due_date=date(2026, 2, 1)),
                InstallmentPlanItem(sequence=2, amount=5_000_000, due_date=date(2026, 3, 1)),
            ],
        ),
    )

    assert invoice.total_amount == 10_000_000
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    assert sum(i.amount for i in installments) == invoice.total_amount


def test_finance_invariant_invalid_sum(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    course.current_price = 10_000_000
    db_session.commit()

    enrollment = _create_enrollment(db_session, org_id, person, course_class)

    with pytest.raises(HTTPException) as exc_info:
        finance_service.issue_invoice(
            db_session,
            org_id,
            InvoiceCreate(
                enrollment_id=enrollment.id,
                installments=[
                    InstallmentPlanItem(
                        sequence=1, amount=4_000_000, due_date=date(2026, 2, 1)
                    ),
                    InstallmentPlanItem(
                        sequence=2, amount=5_000_000, due_date=date(2026, 3, 1)
                    ),
                ],
            ),
        )

    assert exc_info.value.status_code == 422
    assert "Installment amounts must sum to invoice total_amount" in exc_info.value.detail
    assert "10000000" in exc_info.value.detail
    assert "9000000" in exc_info.value.detail


def test_price_snapshot_immutable(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    course.current_price = 500_000
    db_session.commit()

    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    assert enrollment.price_snapshot == 500_000

    course_service.update_course(
        db_session,
        org_id,
        course.id,
        CourseUpdate(current_price=600_000),
    )

    refreshed = enrollment_service.get_enrollment(db_session, org_id, enrollment.id)
    assert refreshed.price_snapshot == 500_000
    assert refreshed.final_amount == 500_000


def test_update_installment_after_payment(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)

    invoice = finance_service.issue_invoice(
        db_session,
        org_id,
        InvoiceCreate(
            enrollment_id=enrollment.id,
            installments=[
                InstallmentPlanItem(
                    sequence=1, amount=enrollment.final_amount, due_date=date(2026, 2, 1)
                ),
            ],
        ),
    )
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    installment = installments[0]
    installment.paid_amount = 1_000_000
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        finance_service.update_installment(
            db_session,
            org_id,
            installment.id,
            InstallmentUpdate(amount=4_000_000),
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Cannot change amount after payments have been recorded"
