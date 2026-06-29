from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.finance.enums import InstallmentStatus, InvoiceStatus


class InstallmentPlanItem(BaseModel):
    sequence: int = Field(
        ge=1,
        description="Installment order (1-based). Must be unique within the plan.",
        examples=[1],
    )
    amount: int = Field(
        gt=0,
        description="Installment amount in Toman. Must be > 0.",
        examples=[500000],
    )
    due_date: date = Field(description="Payment due date.")


class InvoiceCreate(BaseModel):
    enrollment_id: int = Field(description="Enrollment to invoice.")
    installments: list[InstallmentPlanItem] = Field(
        min_length=1,
        description="Installment schedule. Amounts must sum to enrollment final_amount.",
    )


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique invoice identifier.")
    enrollment_id: int = Field(description="Linked enrollment. Immutable.")
    total_amount: int = Field(
        description="Invoice total in Toman.",
        examples=[900000],
    )
    status: InvoiceStatus = Field(description="Current invoice status.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class InstallmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique installment identifier.")
    invoice_id: int = Field(description="Parent invoice. Immutable.")
    sequence: int = Field(description="Installment order within the invoice.")
    amount: int = Field(
        description="Installment amount in Toman.",
        examples=[500000],
    )
    paid_amount: int = Field(
        description="Amount paid so far in Toman.",
        examples=[250000],
    )
    due_date: date = Field(description="Payment due date.")
    status: InstallmentStatus = Field(description="Current installment status.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class InvoiceDetailRead(InvoiceRead):
    installments: list[InstallmentRead] = Field(
        description="Installment schedule for this invoice."
    )


class InstallmentUpdate(BaseModel):
    amount: int | None = Field(
        default=None,
        gt=0,
        description="Updated amount in Toman. Must be > 0. Not allowed after payments.",
        examples=[600000],
    )
    due_date: date | None = Field(default=None, description="Updated due date.")


class PaymentCreate(BaseModel):
    installment_id: int = Field(description="Installment to pay against.")
    amount: int = Field(
        gt=0,
        description="Payment amount in Toman. Must be > 0.",
        examples=[500000],
    )
    payment_date: date | None = Field(
        default=None,
        description="Date of payment. Defaults to today.",
    )
    notes: str | None = Field(default=None, description="Optional payment notes.")


class RefundCreate(BaseModel):
    payment_id: int = Field(description="Payment to refund.")
    amount: int = Field(
        gt=0,
        description="Refund amount in Toman. Must be > 0 and <= payment amount.",
        examples=[500000],
    )
    reason: str = Field(min_length=1, description="Reason for the refund.")
    notes: str | None = Field(default=None, description="Optional refund notes.")


class RefundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique refund identifier.")
    payment_id: int = Field(description="Refunded payment. Immutable.")
    amount: int = Field(
        description="Refund amount in Toman.",
        examples=[500000],
    )
    reason: str = Field(description="Reason for the refund.")
    refunded_by: int = Field(description="User who processed the refund.")
    refund_date: date = Field(description="Date the refund was issued.")
    notes: str | None = Field(description="Optional refund notes.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique payment identifier.")
    installment_id: int = Field(description="Paid installment. Immutable.")
    amount: int = Field(
        description="Payment amount in Toman.",
        examples=[500000],
    )
    recorded_by: int = Field(description="User who recorded the payment.")
    payment_date: date = Field(description="Date the payment was made.")
    notes: str | None = Field(description="Optional payment notes.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")
