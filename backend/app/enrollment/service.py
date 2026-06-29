from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.pagination import paginate_query
from app.activity import service as activity_service
from app.consultation import service as consultation_service
from app.course import service as course_service
from app.course_class import service as class_service
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.model import Enrollment
from app.enrollment.schemas import EnrollmentCreate, EnrollmentUpdate
from app.finance import service as finance_service
from app.finance.enums import InstallmentStatus
from app.finance.model import Invoice, Payment, Refund
from app.journey import service as journey_service
from app.person import service as person_service
from app.task.enums import TaskStatus
from app.task.model import Task
from app.tenancy.scoping import scoped


def list_enrollments(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Enrollment], int]:
    stmt = scoped(select(Enrollment), Enrollment, org_id).order_by(Enrollment.id.desc())
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_enrollment(db: Session, org_id: int, enrollment_id: int) -> Enrollment:
    stmt = scoped(select(Enrollment), Enrollment, org_id).where(
        Enrollment.id == enrollment_id
    )
    enrollment = db.scalars(stmt).first()
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found"
        )
    return enrollment


def _validate_fks(
    db: Session,
    org_id: int,
    *,
    person_id: int,
    class_id: int,
    consultation_id: int | None = None,
    journey_id: int | None = None,
) -> int:
    person_service.get_person(db, org_id, person_id)
    course_class = class_service.get_class(db, org_id, class_id)
    if consultation_id is not None:
        consultation_service.get_consultation(db, org_id, consultation_id)
    if journey_id is not None:
        journey_service.get_journey(db, org_id, journey_id)
    return course_class.course_id


def _validate_discount(discount_snapshot: int, price_snapshot: int) -> None:
    if discount_snapshot > price_snapshot:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="discount_snapshot cannot exceed price_snapshot",
        )


def create_enrollment(
    db: Session, org_id: int, data: EnrollmentCreate
) -> Enrollment:
    course_id = _validate_fks(
        db,
        org_id,
        person_id=data.person_id,
        class_id=data.class_id,
        consultation_id=data.consultation_id,
        journey_id=data.journey_id,
    )
    course = course_service.get_course(db, org_id, course_id)
    price_snapshot = course.current_price
    _validate_discount(data.discount_snapshot, price_snapshot)

    enrollment = Enrollment(
        person_id=data.person_id,
        class_id=data.class_id,
        consultation_id=data.consultation_id,
        journey_id=data.journey_id,
        status=data.status,
        price_snapshot=price_snapshot,
        discount_snapshot=data.discount_snapshot,
        final_amount=price_snapshot - data.discount_snapshot,
        start_date=data.start_date,
        org_id=org_id,
    )
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Person already has a live enrollment for this class",
        ) from None
    db.refresh(enrollment)
    return enrollment


def update_status(
    db: Session, org_id: int, enrollment_id: int, data: EnrollmentUpdate
) -> Enrollment:
    enrollment = get_enrollment(db, org_id, enrollment_id)
    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(enrollment, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Person already has a live enrollment for this class",
        ) from None
    db.refresh(enrollment)
    return enrollment


def _refundable_amount(db: Session, org_id: int, payment_id: int) -> int:
    stmt = scoped(
        select(func.coalesce(func.sum(Refund.amount), 0)),
        Refund,
        org_id,
    ).where(Refund.payment_id == payment_id)
    already_refunded = int(db.scalar(stmt) or 0)
    payment = finance_service.get_payment(db, org_id, payment_id)
    return payment.amount - already_refunded


def drop_enrollment(
    db: Session,
    org_id: int,
    enrollment_id: int,
    reason: str,
    dropped_by_user_id: int,
    notes: str | None = None,
) -> Enrollment:
    enrollment = get_enrollment(db, org_id, enrollment_id)
    if enrollment.status == EnrollmentStatus.dropped:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enrollment is already dropped",
        )

    enrollment.status = EnrollmentStatus.dropped
    db.flush()

    stmt = scoped(select(Invoice), Invoice, org_id).where(
        Invoice.enrollment_id == enrollment_id
    )
    invoice = db.scalars(stmt).first()
    if invoice is not None:
        installments = finance_service.get_installments_for_invoice(
            db, org_id, invoice.id
        )
        for inst in installments:
            if inst.status != InstallmentStatus.cancelled:
                inst.status = InstallmentStatus.cancelled
            if inst.paid_amount > 0:
                pay_stmt = scoped(select(Payment), Payment, org_id).where(
                    Payment.installment_id == inst.id
                )
                payments = list(db.scalars(pay_stmt).all())
                for payment in payments:
                    refundable = _refundable_amount(db, org_id, payment.id)
                    if refundable > 0:
                        finance_service.refund_payment(
                            db,
                            org_id,
                            payment.id,
                            refundable,
                            reason,
                            dropped_by_user_id,
                            notes=notes,
                        )

        finance_service.recompute_invoice_status(invoice, installments)
        db.flush()

    task_stmt = scoped(select(Task), Task, org_id).where(
        Task.related_entity_type == "enrollment",
        Task.related_entity_id == enrollment_id,
    )
    for task in db.scalars(task_stmt).all():
        if task.status != TaskStatus.cancelled:
            task.status = TaskStatus.cancelled
            task.completed_at = None

    db.commit()

    activity_service.log_activity(
        db,
        org_id,
        enrollment.person_id,
        "enrollment_dropped",
        payload={
            "enrollment_id": enrollment_id,
            "reason": reason,
            "notes": notes,
        },
        actor_id=dropped_by_user_id,
    )

    db.refresh(enrollment)
    return enrollment
