from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.enrollment import service as enrollment_service
from app.finance.enums import InstallmentStatus, InvoiceStatus
from app.finance.model import Installment, Invoice
from app.finance.schemas import InstallmentUpdate, InvoiceCreate
from app.tenancy.scoping import scoped


def validate_invariant(invoice: Invoice, installments: list[Installment]) -> None:
    total = sum(
        inst.amount
        for inst in installments
        if inst.status != InstallmentStatus.cancelled
    )
    if total != invoice.total_amount:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Installment amounts must sum to invoice total_amount "
                f"({invoice.total_amount}); non-cancelled installments sum to {total}"
            ),
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


def list_invoices(db: Session, org_id: int) -> list[Invoice]:
    stmt = scoped(select(Invoice), Invoice, org_id).order_by(Invoice.id.desc())
    return list(db.scalars(stmt).all())


def get_invoice(db: Session, org_id: int, invoice_id: int) -> Invoice:
    stmt = scoped(select(Invoice), Invoice, org_id).where(Invoice.id == invoice_id)
    invoice = db.scalars(stmt).first()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
        )
    return invoice


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found"
        )
    return installment


def issue_invoice(db: Session, org_id: int, data: InvoiceCreate) -> Invoice:
    enrollment = enrollment_service.get_enrollment(db, org_id, data.enrollment_id)

    sequences = [item.sequence for item in data.installments]
    if len(sequences) != len(set(sequences)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Installment sequences must be unique",
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Enrollment already has an invoice",
        ) from None
    db.refresh(invoice)
    return invoice


def update_installment(
    db: Session, org_id: int, installment_id: int, data: InstallmentUpdate
) -> Installment:
    installment = get_installment(db, org_id, installment_id)
    if installment.status in (InstallmentStatus.paid, InstallmentStatus.cancelled):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot modify a paid or cancelled installment",
        )
    if installment.paid_amount > 0 and data.amount is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot change amount after payments have been recorded",
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
