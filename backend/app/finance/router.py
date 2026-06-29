from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.finance import service as finance_service
from app.finance.model import Installment, Invoice, Payment
from app.finance.schemas import (
    InstallmentRead,
    InstallmentUpdate,
    InvoiceCreate,
    InvoiceDetailRead,
    InvoiceRead,
    PaymentCreate,
    PaymentRead,
)
from app.user.model import User

router = APIRouter()
payments_router = APIRouter()


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Invoice]:
    return finance_service.list_invoices(db, current_user.org_id)


@router.get("/{invoice_id}", response_model=InvoiceDetailRead)
def get_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Invoice:
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
    return finance_service.update_installment(
        db, current_user.org_id, installment_id, body
    )


@payments_router.get("", response_model=list[PaymentRead])
def list_payments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Payment]:
    return finance_service.list_payments(db, current_user.org_id)


@payments_router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(
    payment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Payment:
    return finance_service.get_payment(db, current_user.org_id, payment_id)


@payments_router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def record_payment(
    body: PaymentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Payment:
    return finance_service.record_payment(
        db,
        current_user.org_id,
        body.installment_id,
        body.amount,
        current_user.id,
        payment_date=body.payment_date,
        notes=body.notes,
    )
