from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrollment_id: int
    session_date: date
    present: bool
    notes: str | None
    org_id: int
    created_at: datetime
    updated_at: datetime


class AttendanceCreate(BaseModel):
    enrollment_id: int
    session_date: date
    present: bool
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    present: bool | None = None
    notes: str | None = None
