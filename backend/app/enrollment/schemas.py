from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.enrollment.enums import EnrollmentStatus


class EnrollmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    class_id: int
    consultation_id: int | None
    journey_id: int | None
    status: EnrollmentStatus
    price_snapshot: int
    discount_snapshot: int
    final_amount: int
    start_date: date | None
    org_id: int
    created_at: datetime
    updated_at: datetime


class EnrollmentCreate(BaseModel):
    person_id: int
    class_id: int
    consultation_id: int | None = None
    journey_id: int | None = None
    discount_snapshot: int = Field(default=0, ge=0)
    start_date: date | None = None
    status: EnrollmentStatus = EnrollmentStatus.pre_enroll


class EnrollmentUpdate(BaseModel):
    status: EnrollmentStatus | None = None
    start_date: date | None = None
