from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique attendance record identifier.")
    enrollment_id: int = Field(description="Enrollment this session belongs to.")
    session_date: date = Field(description="Date of the class session.")
    present: bool = Field(description="Whether the student was present.")
    notes: str | None = Field(description="Optional session notes.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class AttendanceCreate(BaseModel):
    enrollment_id: int = Field(description="Enrollment to record attendance for.")
    session_date: date = Field(description="Date of the class session.")
    present: bool = Field(description="Whether the student was present.")
    notes: str | None = Field(default=None, description="Optional session notes.")


class AttendanceUpdate(BaseModel):
    present: bool | None = Field(
        default=None,
        description="Updated presence status.",
    )
    notes: str | None = Field(default=None, description="Updated session notes.")
