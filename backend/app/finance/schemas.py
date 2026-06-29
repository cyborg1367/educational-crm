from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.finance.enums import InstallmentStatus, InvoiceStatus


class InstallmentPlanItem(BaseModel):
    sequence: int = Field(ge=1)
    amount: int = Field(gt=0)
    due_date: date


class InvoiceCreate(BaseModel):
    enrollment_id: int
    installments: list[InstallmentPlanItem] = Field(min_length=1)


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrollment_id: int
    total_amount: int
    status: InvoiceStatus
    org_id: int
    created_at: datetime
    updated_at: datetime


class InstallmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_id: int
    sequence: int
    amount: int
    paid_amount: int
    due_date: date
    status: InstallmentStatus
    org_id: int
    created_at: datetime
    updated_at: datetime


class InvoiceDetailRead(InvoiceRead):
    installments: list[InstallmentRead]


class InstallmentUpdate(BaseModel):
    amount: int | None = Field(default=None, gt=0)
    due_date: date | None = None


class PaymentCreate(BaseModel):
    installment_id: int
    amount: int = Field(gt=0)
    payment_date: date | None = None
    notes: str | None = None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    installment_id: int
    amount: int
    recorded_by: int
    payment_date: date
    notes: str | None
    org_id: int
    created_at: datetime
    updated_at: datetime
