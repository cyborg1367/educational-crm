from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.enrollment.enums import EnrollmentStatus


class EnrollmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique enrollment identifier.")
    person_id: int = Field(description="Enrolled person. Immutable.")
    class_id: int = Field(description="Enrolled class. Immutable.")
    consultation_id: int | None = Field(
        description="Originating consultation, if any."
    )
    journey_id: int | None = Field(description="Linked journey, if any.")
    status: EnrollmentStatus = Field(description="Current enrollment status.")
    price_snapshot: int = Field(
        description="Course price at enrollment time in Toman. Immutable.",
        examples=[1000000],
    )
    discount_snapshot: int = Field(
        description="Discount applied at enrollment in Toman.",
        examples=[100000],
    )
    final_amount: int = Field(
        description="Net amount due (price minus discount) in Toman.",
        examples=[900000],
    )
    start_date: date | None = Field(description="Actual or planned start date.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class EnrollmentCreate(BaseModel):
    person_id: int = Field(description="Person to enroll.")
    class_id: int = Field(description="Class to enroll in.")
    consultation_id: int | None = Field(
        default=None,
        description="Optional originating consultation.",
    )
    journey_id: int | None = Field(
        default=None,
        description="Optional linked journey.",
    )
    discount_snapshot: int = Field(
        default=0,
        ge=0,
        description="Discount in Toman. Must be >= 0 and <= price.",
        examples=[100000],
    )
    start_date: date | None = Field(
        default=None,
        description="Optional start date.",
    )
    status: EnrollmentStatus = Field(
        default=EnrollmentStatus.pre_enroll,
        description="Initial enrollment status.",
    )


class EnrollmentUpdate(BaseModel):
    status: EnrollmentStatus | None = Field(
        default=None,
        description="Updated enrollment status.",
    )
    start_date: date | None = Field(default=None, description="Updated start date.")
