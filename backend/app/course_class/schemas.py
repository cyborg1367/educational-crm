from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.course_class.enums import ClassStatus

WEEKDAY_VALUES = frozenset(
    {"saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"}
)


class CourseClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique class instance identifier.")
    course_id: int = Field(description="Course this class delivers.")
    teacher_id: int = Field(description="Assigned teacher user ID.")
    name: str = Field(description="Class display name or cohort label.")
    start_date: date = Field(description="Scheduled start date.")
    end_date: date | None = Field(description="Scheduled end date, if known.")
    weekdays: list[str] | None = Field(
        description="Weekdays the class meets, e.g. saturday, monday."
    )
    status: ClassStatus = Field(description="Current class lifecycle status.")
    enrollment_count: int = Field(
        description="Number of enrollment records currently referencing this class."
    )
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
    weekdays: list[str] = Field(
        min_length=1,
        description="Weekdays the class meets.",
        examples=[["saturday", "monday", "wednesday"]],
    )
    status: ClassStatus = Field(
        default=ClassStatus.planned,
        description="Initial class status.",
    )

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, value: list[str]) -> list[str]:
        invalid = [day for day in value if day not in WEEKDAY_VALUES]
        if invalid:
            raise ValueError(
                f"weekdays contains invalid values: {', '.join(invalid)}"
            )
        return value


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
    weekdays: list[str] | None = Field(
        default=None,
        description="Updated weekdays the class meets.",
    )
    status: ClassStatus | None = Field(default=None, description="Updated status.")

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        invalid = [day for day in value if day not in WEEKDAY_VALUES]
        if invalid:
            raise ValueError(
                f"weekdays contains invalid values: {', '.join(invalid)}"
            )
        if len(value) < 1:
            raise ValueError("weekdays must contain at least one day")
        return value
