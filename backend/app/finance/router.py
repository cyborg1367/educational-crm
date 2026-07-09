from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.rate_limit import SENSITIVE_LIMIT
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
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


@router.get("", response_model=PaginatedResponse[InvoiceRead])
def list_invoices(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[InvoiceRead]:
    """List invoices.

    Returns a paginated list of invoices in the organization.
    """
    items, total_count = finance_service.list_invoices(
        db,
        current_user.org_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


# NOTE: must be registered before "/{invoice_id}" so the literal segment wins.
@router.get("/installments", response_model=PaginatedResponse[InstallmentRead])
def list_all_installments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    due_from: Annotated[
        date | None, Query(description="Only installments due on/after this date.")
    ] = None,
    due_to: Annotated[
        date | None, Query(description="Only installments due on/before this date.")
    ] = None,
) -> PaginatedResponse[InstallmentRead]:
    """List installments across all invoices.

    Returns a paginated, org-scoped list of installments, optionally bounded
    by due date. Designed for calendar/reporting views that need a date
    window in a single request.
    """
    items, total_count = finance_service.list_org_installments(
        db,
        current_user.org_id,
        due_from=due_from,
        due_to=due_to,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


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
    invoice = finance_service.issue_invoice(
        db, current_user.org_id, body, actor_id=current_user.id
    )
    invoice.installments = finance_service.get_installments_for_invoice(
        db, current_user.org_id, invoice.id
    )
    return invoice


@router.get("/{invoice_id}/installments", response_model=PaginatedResponse[InstallmentRead])
def list_installments(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[InstallmentRead]:
    """List installments for an invoice.

    Returns a paginated installment schedule for a given invoice.
    Returns 404 if the invoice is not found in the org.
    """
    items, total_count = finance_service.list_installments(
        db,
        current_user.org_id,
        invoice_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
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


@payments_router.get("", response_model=PaginatedResponse[PaymentRead])
def list_payments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[PaymentRead]:
    """List payments.

    Returns a paginated list of payment records in the organization.
    """
    items, total_count = finance_service.list_payments(
        db,
        current_user.org_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


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
@SENSITIVE_LIMIT
def record_payment(
    request: Request,
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


@refunds_router.get("", response_model=PaginatedResponse[RefundRead])
def list_refunds(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[RefundRead]:
    """List refunds.

    Returns a paginated list of refund records in the organization.
    """
    items, total_count = finance_service.list_refunds(
        db,
        current_user.org_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


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
@SENSITIVE_LIMIT
def refund_payment(
    request: Request,
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
