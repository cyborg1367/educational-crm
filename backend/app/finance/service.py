from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.core.logging_config import get_logger
from app.core.pagination import paginate_query
from app.course_class import service as class_service
from app.enrollment import service as enrollment_service
from app.finance.enums import InstallmentStatus, InvoiceStatus
from app.finance.model import Installment, Invoice, Payment, Refund
from app.finance.schemas import InstallmentUpdate, InvoiceCreate
from app.notifications import service as notifications_service
from app.tenancy.scoping import scoped

logger = get_logger(__name__)


def validate_invariant(invoice: Invoice, installments: list[Installment]) -> None:
    total = sum(
        inst.amount
        for inst in installments
        if inst.status != InstallmentStatus.cancelled
    )
    if total != invoice.total_amount:
        raise ValidationError(
            (
                f"Installment amounts must sum to invoice total_amount "
                f"({invoice.total_amount}); non-cancelled installments sum to {total}"
            ),
            field="installments",
        )


def recompute_installment_status(inst: Installment) -> None:
    if inst.status == InstallmentStatus.cancelled:
        return
    paid = inst.paid_amount
    if paid >= inst.amount:
        inst.status = InstallmentStatus.paid
    elif paid > 0:
        inst.status = InstallmentStatus.partially_paid
    elif inst.due_date < date.today():
        inst.status = InstallmentStatus.overdue
    else:
        inst.status = InstallmentStatus.pending


def recompute_invoice_status(invoice: Invoice, installments: list[Installment]) -> None:
    active = [i for i in installments if i.status != InstallmentStatus.cancelled]
    if not active:
        if all(i.paid_amount == 0 for i in installments):
            invoice.status = InvoiceStatus.void
        elif any(i.paid_amount > 0 for i in installments):
            invoice.status = InvoiceStatus.partially_paid
        else:
            invoice.status = InvoiceStatus.void
    elif all(i.status == InstallmentStatus.paid for i in active):
        invoice.status = InvoiceStatus.paid
    elif any(i.paid_amount > 0 for i in installments):
        invoice.status = InvoiceStatus.partially_paid
    else:
        invoice.status = InvoiceStatus.open


def list_invoices(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Invoice], int]:
    stmt = scoped(select(Invoice), Invoice, org_id).order_by(Invoice.id.desc())
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_invoice(db: Session, org_id: int, invoice_id: int) -> Invoice:
    stmt = scoped(select(Invoice), Invoice, org_id).where(Invoice.id == invoice_id)
    invoice = db.scalars(stmt).first()
    if invoice is None:
        raise NotFoundError("Invoice not found")
    return invoice


def list_installments(
    db: Session,
    org_id: int,
    invoice_id: int,
    *,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Installment], int]:
    get_invoice(db, org_id, invoice_id)
    stmt = (
        scoped(select(Installment), Installment, org_id)
        .where(Installment.invoice_id == invoice_id)
        .order_by(Installment.sequence)
    )
    return paginate_query(db, stmt, limit=limit, offset=offset)


def list_org_installments(
    db: Session,
    org_id: int,
    *,
    due_from: date | None = None,
    due_to: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Installment], int]:
    """List installments across all invoices in the org, optionally bounded
    by due date. Lets consumers (e.g. the calendar) fetch a date window in a
    single request instead of iterating invoices."""
    stmt = scoped(select(Installment), Installment, org_id).order_by(
        Installment.due_date, Installment.invoice_id, Installment.sequence
    )
    if due_from is not None:
        stmt = stmt.where(Installment.due_date >= due_from)
    if due_to is not None:
        stmt = stmt.where(Installment.due_date <= due_to)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_installments_for_invoice(
    db: Session, org_id: int, invoice_id: int
) -> list[Installment]:
    get_invoice(db, org_id, invoice_id)
    stmt = (
        scoped(select(Installment), Installment, org_id)
        .where(Installment.invoice_id == invoice_id)
        .order_by(Installment.sequence)
    )
    return list(db.scalars(stmt).all())


def get_installment(db: Session, org_id: int, installment_id: int) -> Installment:
    stmt = scoped(select(Installment), Installment, org_id).where(
        Installment.id == installment_id
    )
    installment = db.scalars(stmt).first()
    if installment is None:
        raise NotFoundError("Installment not found")
    return installment


def _unpaid_installment_count(installments: list[Installment]) -> int:
    return sum(
        1
        for inst in installments
        if inst.status
        not in (InstallmentStatus.paid, InstallmentStatus.cancelled)
    )


def _log_enrollment_prepayment_activity(
    db: Session,
    org_id: int,
    *,
    enrollment_id: int,
    upfront_amount: int,
    installments: list[Installment],
    actor_id: int,
) -> None:
    enrollment = enrollment_service.get_enrollment(db, org_id, enrollment_id)
    course_class = class_service.get_class(db, org_id, enrollment.class_id)
    remaining = _unpaid_installment_count(installments)

    activity_service.log_activity(
        db,
        org_id,
        enrollment.person_id,
        "enrollment_prepayment",
        payload={
            "enrollment_id": enrollment_id,
            "class_name": course_class.name,
            "upfront_amount": upfront_amount,
            "remaining_installments": remaining,
            "total_installments": len(installments),
        },
        actor_id=actor_id,
    )


def issue_invoice(
    db: Session,
    org_id: int,
    data: InvoiceCreate,
    *,
    actor_id: int | None = None,
) -> Invoice:
    enrollment = enrollment_service.get_enrollment(db, org_id, data.enrollment_id)

    sequences = [item.sequence for item in data.installments]
    if len(sequences) != len(set(sequences)):
        raise ValidationError(
            "Installment sequences must be unique",
            field="installments",
        )

    invoice = Invoice(
        enrollment_id=enrollment.id,
        total_amount=enrollment.final_amount,
        status=InvoiceStatus.open,
        org_id=org_id,
    )
    db.add(invoice)
    db.flush()

    installments = [
        Installment(
            invoice_id=invoice.id,
            sequence=item.sequence,
            amount=item.amount,
            paid_amount=0,
            due_date=item.due_date,
            status=InstallmentStatus.pending,
            org_id=org_id,
        )
        for item in data.installments
    ]
    for inst in installments:
        recompute_installment_status(inst)
        db.add(inst)

    validate_invariant(invoice, installments)
    recompute_invoice_status(invoice, installments)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Enrollment already has an invoice") from None
    db.refresh(invoice)

    if data.record_upfront_payment:
        if actor_id is None:
            raise ValidationError(
                "actor_id is required when record_upfront_payment is true",
                field="record_upfront_payment",
            )
        installments = get_installments_for_invoice(db, org_id, invoice.id)
        upfront = next((i for i in installments if i.sequence == 1), None)
        if upfront is None:
            raise ValidationError(
                "record_upfront_payment requires a sequence-1 installment",
                field="installments",
            )
        record_payment(
            db,
            org_id,
            upfront.id,
            upfront.amount,
            actor_id,
            payment_date=upfront.due_date,
            notes="پیش‌پرداخت هنگام ثبت‌نام",
            skip_activity=True,
        )
        installments = get_installments_for_invoice(db, org_id, invoice.id)
        _log_enrollment_prepayment_activity(
            db,
            org_id,
            enrollment_id=invoice.enrollment_id,
            upfront_amount=upfront.amount,
            installments=installments,
            actor_id=actor_id,
        )
        db.commit()
        db.refresh(invoice)

    return invoice


def update_installment(
    db: Session, org_id: int, installment_id: int, data: InstallmentUpdate
) -> Installment:
    installment = get_installment(db, org_id, installment_id)
    if installment.status in (InstallmentStatus.paid, InstallmentStatus.cancelled):
        raise ValidationError(
            "Cannot modify a paid or cancelled installment",
            field="status",
        )
    if installment.paid_amount > 0 and data.amount is not None:
        raise ValidationError(
            "Cannot change amount after payments have been recorded",
            field="amount",
        )

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(installment, field, value)

    recompute_installment_status(installment)

    invoice = get_invoice(db, org_id, installment.invoice_id)
    installments = get_installments_for_invoice(db, org_id, invoice.id)
    validate_invariant(invoice, installments)
    recompute_invoice_status(invoice, installments)

    db.commit()
    db.refresh(installment)
    return installment


def cancel_installments_on_drop(db: Session, org_id: int, enrollment_id: int) -> None:
    stmt = scoped(select(Invoice), Invoice, org_id).where(
        Invoice.enrollment_id == enrollment_id
    )
    invoice = db.scalars(stmt).first()
    if invoice is None:
        return

    installments = get_installments_for_invoice(db, org_id, invoice.id)
    for inst in installments:
        if inst.status in (
            InstallmentStatus.pending,
            InstallmentStatus.partially_paid,
            InstallmentStatus.overdue,
        ):
            inst.status = InstallmentStatus.cancelled

    recompute_invoice_status(invoice, installments)
    db.commit()


def list_payments(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Payment], int]:
    stmt = scoped(select(Payment), Payment, org_id).order_by(Payment.id.desc())
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_payment(db: Session, org_id: int, payment_id: int) -> Payment:
    stmt = scoped(select(Payment), Payment, org_id).where(Payment.id == payment_id)
    payment = db.scalars(stmt).first()
    if payment is None:
        raise NotFoundError("Payment not found")
    return payment


def record_payment(
    db: Session,
    org_id: int,
    installment_id: int,
    amount: int,
    recorded_by_user_id: int,
    *,
    payment_date: date | None = None,
    notes: str | None = None,
    skip_activity: bool = False,
) -> Payment:
    if amount <= 0:
        raise ValidationError(
            "Payment amount must be greater than zero",
            field="amount",
        )

    installment = get_installment(db, org_id, installment_id)
    if installment.status == InstallmentStatus.cancelled:
        raise ValidationError(
            "Cannot record payment on a cancelled installment",
            field="installment_id",
        )

    payment = Payment(
        installment_id=installment.id,
        amount=amount,
        recorded_by=recorded_by_user_id,
        payment_date=payment_date or date.today(),
        notes=notes,
        org_id=org_id,
    )
    db.add(payment)
    installment.paid_amount += amount
    recompute_installment_status(installment)

    invoice = get_invoice(db, org_id, installment.invoice_id)
    installments = get_installments_for_invoice(db, org_id, invoice.id)
    recompute_invoice_status(invoice, installments)
    db.flush()

    enrollment = enrollment_service.get_enrollment(db, org_id, invoice.enrollment_id)
    remaining_unpaid = _unpaid_installment_count(installments)
    if not skip_activity:
        activity_service.log_activity(
            db,
            org_id,
            enrollment.person_id,
            "payment_recorded",
            payload={
                "payment_id": payment.id,
                "installment_id": installment.id,
                "installment_sequence": installment.sequence,
                "total_installments": len(installments),
                "remaining_unpaid_installments": remaining_unpaid,
                "amount": amount,
                "invoice_id": invoice.id,
                "enrollment_id": enrollment.id,
            },
            actor_id=recorded_by_user_id,
        )
    logger.info(
        "payment_recorded",
        extra={
            "event": "payment_recorded",
            "payment_id": payment.id,
            "amount": amount,
            "status": installment.status.value,
        },
    )
    notifications_service.notify_payment_recorded(
        db, org_id, enrollment.person_id, amount
    )

    payment_count_stmt = scoped(
        select(func.count(Payment.id)),
        Payment,
        org_id,
    ).where(
        Payment.installment_id.in_(
            select(Installment.id).where(Installment.invoice_id == invoice.id)
        )
    )
    if int(db.scalar(payment_count_stmt) or 0) == 1:
        from app.workflow import service as workflow_service

        workflow_service.on_first_payment(
            db,
            org_id,
            enrollment.id,
            actor_id=recorded_by_user_id,
            skip_activity=skip_activity,
        )
    else:
        db.commit()
    db.refresh(payment)
    return payment


def _refunded_amount_for_payment(db: Session, org_id: int, payment_id: int) -> int:
    stmt = scoped(
        select(func.coalesce(func.sum(Refund.amount), 0)),
        Refund,
        org_id,
    ).where(Refund.payment_id == payment_id)
    return int(db.scalar(stmt) or 0)


def list_refunds(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Refund], int]:
    stmt = scoped(select(Refund), Refund, org_id).order_by(Refund.id.desc())
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_refund(db: Session, org_id: int, refund_id: int) -> Refund:
    stmt = scoped(select(Refund), Refund, org_id).where(Refund.id == refund_id)
    refund = db.scalars(stmt).first()
    if refund is None:
        raise NotFoundError("Refund not found")
    return refund


def refund_payment(
    db: Session,
    org_id: int,
    payment_id: int,
    amount: int,
    reason: str,
    refunded_by_user_id: int,
    *,
    refund_date: date | None = None,
    notes: str | None = None,
) -> Refund:
    if amount <= 0:
        raise ValidationError(
            "Refund amount must be greater than zero",
            field="amount",
        )

    payment = get_payment(db, org_id, payment_id)
    already_refunded = _refunded_amount_for_payment(db, org_id, payment_id)
    refundable = payment.amount - already_refunded
    if amount > refundable:
        raise ValidationError(
            (
                f"Refund amount cannot exceed refundable balance "
                f"({refundable} Toman remaining on this payment)"
            ),
            field="amount",
        )

    installment = get_installment(db, org_id, payment.installment_id)
    refund = Refund(
        payment_id=payment.id,
        amount=amount,
        reason=reason,
        refunded_by=refunded_by_user_id,
        refund_date=refund_date or date.today(),
        notes=notes,
        org_id=org_id,
    )
    db.add(refund)
    installment.paid_amount -= amount
    recompute_installment_status(installment)

    invoice = get_invoice(db, org_id, installment.invoice_id)
    installments = get_installments_for_invoice(db, org_id, invoice.id)
    recompute_invoice_status(invoice, installments)
    db.flush()

    enrollment = enrollment_service.get_enrollment(db, org_id, invoice.enrollment_id)
    activity_service.log_activity(
        db,
        org_id,
        enrollment.person_id,
        "payment_refunded",
        payload={
            "refund_id": refund.id,
            "payment_id": payment.id,
            "installment_id": installment.id,
            "amount": amount,
            "reason": reason,
            "invoice_id": invoice.id,
            "enrollment_id": enrollment.id,
        },
        actor_id=refunded_by_user_id,
    )
    db.commit()
    db.refresh(refund)
    return refund
