from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.finance import service as finance_service
from app.finance.model import Installment, Invoice, Payment, Refund
from app.finance.schemas import (
    InstallmentRead,
    InstallmentUpdate,
    InvoiceCreate,
    InvoiceDetailRead,
    InvoiceRead,
    PaymentCreate,
    PaymentRead,
    RefundCreate,
    RefundRead,
)
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)
payments_router = APIRouter(responses=PROTECTED_RESPONSES)
refunds_router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Invoice]:
    """List all invoices.

    Returns every invoice in the authenticated user's organization.
    """
    return finance_service.list_invoices(db, current_user.org_id)


@router.get("/{invoice_id}", response_model=InvoiceDetailRead)
def get_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Invoice:
    """Get an invoice by ID.

    Fetches an invoice with its installment schedule.
    Returns 404 if the invoice is not found in the org.
    """
    invoice = finance_service.get_invoice(db, current_user.org_id, invoice_id)
    invoice.installments = finance_service.get_installments_for_invoice(
        db, current_user.org_id, invoice_id
    )
    return invoice


@router.post("", response_model=InvoiceDetailRead, status_code=status.HTTP_201_CREATED)
def issue_invoice(
    body: InvoiceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Invoice:
    """Issue an invoice for an enrollment.

    Creates an invoice and installment plan for an enrollment.
    Returns 404 if the enrollment is not found.
    Returns 409 if the enrollment already has an invoice.
    Returns 422 if installment amounts do not sum to total or sequences are duplicated.
    """
    invoice = finance_service.issue_invoice(db, current_user.org_id, body)
    invoice.installments = finance_service.get_installments_for_invoice(
        db, current_user.org_id, invoice.id
    )
    return invoice


@router.get("/{invoice_id}/installments", response_model=list[InstallmentRead])
def list_installments(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Installment]:
    """List installments for an invoice.

    Returns the installment schedule for a given invoice.
    Returns 404 if the invoice is not found in the org.
    """
    return finance_service.get_installments_for_invoice(
        db, current_user.org_id, invoice_id
    )


@router.patch(
    "/installments/{installment_id}",
    response_model=InstallmentRead,
)
def update_installment(
    installment_id: int,
    body: InstallmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Installment:
    """Update an installment.

    Changes amount or due date on a pending installment.
    Returns 404 if the installment is not found.
    Returns 422 if the installment is paid/cancelled or amount changes after payments.
    """
    return finance_service.update_installment(
        db, current_user.org_id, installment_id, body
    )


@payments_router.get("", response_model=list[PaymentRead])
def list_payments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Payment]:
    """List all payments.

    Returns every payment record in the authenticated user's organization.
    """
    return finance_service.list_payments(db, current_user.org_id)


@payments_router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(
    payment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Payment:
    """Get a payment by ID.

    Fetches a single payment record from the organization.
    Returns 404 if the payment is not found in the org.
    """
    return finance_service.get_payment(db, current_user.org_id, payment_id)


@payments_router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def record_payment(
    body: PaymentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Payment:
    """Record a payment against an installment.

    Records a partial or full payment and updates installment/invoice status.
    Returns 404 if the installment is not found.
    Returns 422 if amount is invalid or installment is cancelled.
    """
    return finance_service.record_payment(
        db,
        current_user.org_id,
        body.installment_id,
        body.amount,
        current_user.id,
        payment_date=body.payment_date,
        notes=body.notes,
    )


@refunds_router.get("", response_model=list[RefundRead])
def list_refunds(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Refund]:
    """List all refunds.

    Returns every refund record in the authenticated user's organization.
    """
    return finance_service.list_refunds(db, current_user.org_id)


@refunds_router.get("/{refund_id}", response_model=RefundRead)
def get_refund(
    refund_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Refund:
    """Get a refund by ID.

    Fetches a single refund record from the organization.
    Returns 404 if the refund is not found in the org.
    """
    return finance_service.get_refund(db, current_user.org_id, refund_id)


@refunds_router.post("", response_model=RefundRead, status_code=status.HTTP_201_CREATED)
def refund_payment(
    body: RefundCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Refund:
    """Refund a payment.

    Creates a refund, reduces installment paid_amount, and recomputes statuses.
    Returns 404 if the payment is not found.
    Returns 422 if amount is invalid or exceeds the refundable balance.
    """
    return finance_service.refund_payment(
        db,
        current_user.org_id,
        body.payment_id,
        body.amount,
        body.reason,
        current_user.id,
        notes=body.notes,
    )
