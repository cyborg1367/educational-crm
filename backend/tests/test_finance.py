"""Finance invariant validation and price snapshot tests."""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.course import service as course_service
from app.course.model import Course
from app.course.schemas import CourseUpdate
from app.course_class.model import CourseClass
from app.enrollment import service as enrollment_service
from app.enrollment.model import Enrollment
from app.enrollment.schemas import EnrollmentCreate
from app.finance import service as finance_service
from app.finance.enums import InstallmentStatus, InvoiceStatus
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


def _issue_single_installment_invoice(
    db_session: Session,
    org_id: int,
    enrollment: Enrollment,
    *,
    amount: int = 5_000_000,
    due_date: date = date(2026, 2, 1),
):
    return finance_service.issue_invoice(
        db_session,
        org_id,
        InvoiceCreate(
            enrollment_id=enrollment.id,
            installments=[
                InstallmentPlanItem(sequence=1, amount=amount, due_date=due_date),
            ],
        ),
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


def test_payment_record_valid(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    invoice = _issue_single_installment_invoice(db_session, org_id, enrollment)
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    installment = installments[0]

    payment = finance_service.record_payment(
        db_session,
        org_id,
        installment.id,
        2_500_000,
        admin_user.id,
    )

    assert payment.amount == 2_500_000
    assert payment.recorded_by == admin_user.id
    assert payment.installment_id == installment.id

    refreshed = finance_service.get_installment(db_session, org_id, installment.id)
    assert refreshed.paid_amount == 2_500_000
    assert refreshed.status == InstallmentStatus.partially_paid

    activities = activity_service.list_activities(
        db_session, org_id, person_id=person.id
    )
    payment_activities = [a for a in activities if a.action == "payment_recorded"]
    assert len(payment_activities) == 1
    assert payment_activities[0].actor_id == admin_user.id
    assert payment_activities[0].payload["amount"] == 2_500_000
    assert payment_activities[0].payload["installment_id"] == installment.id


def test_payment_installment_fully_paid(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    invoice = _issue_single_installment_invoice(db_session, org_id, enrollment)
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    installment = installments[0]

    finance_service.record_payment(
        db_session, org_id, installment.id, 2_500_000, admin_user.id
    )
    finance_service.record_payment(
        db_session, org_id, installment.id, 2_500_000, admin_user.id
    )

    refreshed = finance_service.get_installment(db_session, org_id, installment.id)
    assert refreshed.paid_amount == 5_000_000
    assert refreshed.status == InstallmentStatus.paid

    refreshed_invoice = finance_service.get_invoice(db_session, org_id, invoice.id)
    assert refreshed_invoice.status == InvoiceStatus.paid


def test_payment_invalid_amount(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    invoice = _issue_single_installment_invoice(db_session, org_id, enrollment)
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    installment = installments[0]

    with pytest.raises(HTTPException) as exc_info:
        finance_service.record_payment(
            db_session, org_id, installment.id, 0, admin_user.id
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Payment amount must be greater than zero"


def test_payment_cancelled_installment(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    invoice = _issue_single_installment_invoice(db_session, org_id, enrollment)
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    installment = installments[0]

    finance_service.cancel_installments_on_drop(db_session, org_id, enrollment.id)

    cancelled = finance_service.get_installment(db_session, org_id, installment.id)
    assert cancelled.status == InstallmentStatus.cancelled

    with pytest.raises(HTTPException) as exc_info:
        finance_service.record_payment(
            db_session, org_id, installment.id, 1_000_000, admin_user.id
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Cannot record payment on a cancelled installment"


def _record_partial_payment(
    db_session: Session,
    org_id: int,
    enrollment: Enrollment,
    admin_user: User,
    *,
    amount: int = 2_500_000,
    due_date: date = date(2026, 12, 1),
):
    invoice = _issue_single_installment_invoice(
        db_session, org_id, enrollment, due_date=due_date
    )
    installments = finance_service.get_installments_for_invoice(
        db_session, org_id, invoice.id
    )
    installment = installments[0]
    payment = finance_service.record_payment(
        db_session, org_id, installment.id, amount, admin_user.id
    )
    return invoice, installment, payment


def test_refund_partial(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    _, installment, payment = _record_partial_payment(
        db_session, org_id, enrollment, admin_user
    )

    refund = finance_service.refund_payment(
        db_session,
        org_id,
        payment.id,
        1_000_000,
        "Partial refund",
        admin_user.id,
    )

    assert refund.amount == 1_000_000
    assert refund.payment_id == payment.id
    assert refund.refunded_by == admin_user.id

    refreshed = finance_service.get_installment(db_session, org_id, installment.id)
    assert refreshed.paid_amount == 1_500_000
    assert refreshed.status == InstallmentStatus.partially_paid

    activities = activity_service.list_activities(
        db_session, org_id, person_id=person.id
    )
    refund_activities = [a for a in activities if a.action == "payment_refunded"]
    assert len(refund_activities) == 1
    assert refund_activities[0].payload["amount"] == 1_000_000
    assert refund_activities[0].payload["payment_id"] == payment.id


def test_refund_full(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    _, installment, payment = _record_partial_payment(
        db_session, org_id, enrollment, admin_user
    )

    finance_service.refund_payment(
        db_session,
        org_id,
        payment.id,
        2_500_000,
        "Full refund",
        admin_user.id,
    )

    refreshed = finance_service.get_installment(db_session, org_id, installment.id)
    assert refreshed.paid_amount == 0
    assert refreshed.status == InstallmentStatus.pending


def test_refund_invalid_amount(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    _, _, payment = _record_partial_payment(
        db_session, org_id, enrollment, admin_user
    )

    with pytest.raises(HTTPException) as exc_info:
        finance_service.refund_payment(
            db_session,
            org_id,
            payment.id,
            3_000_000,
            "Too much",
            admin_user.id,
        )

    assert exc_info.value.status_code == 422
    assert "cannot exceed refundable balance" in exc_info.value.detail.lower()


def test_refund_twice(
    db_session: Session,
    org_id: int,
    person: Person,
    course: Course,
    admin_user: User,
    request: pytest.FixtureRequest,
) -> None:
    course_class = request.getfixturevalue("class")
    enrollment = _create_enrollment(db_session, org_id, person, course_class)
    _, installment, payment = _record_partial_payment(
        db_session, org_id, enrollment, admin_user
    )

    finance_service.refund_payment(
        db_session,
        org_id,
        payment.id,
        1_500_000,
        "First partial refund",
        admin_user.id,
    )

    with pytest.raises(HTTPException) as exc_info:
        finance_service.refund_payment(
            db_session,
            org_id,
            payment.id,
            1_500_000,
            "Second refund exceeds remaining balance",
            admin_user.id,
        )

    assert exc_info.value.status_code == 422
    assert "cannot exceed refundable balance" in exc_info.value.detail.lower()

    refreshed = finance_service.get_installment(db_session, org_id, installment.id)
    assert refreshed.paid_amount == 1_000_000
    assert refreshed.status == InstallmentStatus.partially_paid
