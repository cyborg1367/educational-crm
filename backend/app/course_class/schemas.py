from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.course_class.enums import ClassStatus


class CourseClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique class instance identifier.")
    course_id: int = Field(description="Course this class delivers.")
    teacher_id: int = Field(description="Assigned teacher user ID.")
    name: str = Field(description="Class display name or cohort label.")
    start_date: date = Field(description="Scheduled start date.")
    end_date: date | None = Field(description="Scheduled end date, if known.")
    status: ClassStatus = Field(description="Current class lifecycle status.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class CourseClassCreate(BaseModel):
    course_id: int = Field(description="Course to deliver in this class.")
    teacher_id: int = Field(
        description="Teacher user ID. Must reference a user with role teacher."
    )
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Class display name or cohort label.",
        examples=["IELTS Morning Batch - Spring 2026"],
    )
    start_date: date = Field(description="Scheduled start date.")
    end_date: date | None = Field(
        default=None,
        description="Optional scheduled end date.",
    )
    status: ClassStatus = Field(
        default=ClassStatus.planned,
        description="Initial class status.",
    )


class CourseClassUpdate(BaseModel):
    course_id: int | None = Field(default=None, description="Updated course.")
    teacher_id: int | None = Field(
        default=None,
        description="Updated teacher. Must have role teacher.",
    )
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated class name.",
    )
    start_date: date | None = Field(default=None, description="Updated start date.")
    end_date: date | None = Field(default=None, description="Updated end date.")
    status: ClassStatus | None = Field(default=None, description="Updated status.")
