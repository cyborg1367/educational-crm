from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique course identifier.")
    department_id: int = Field(description="Department that owns this course.")
    title: str = Field(description="Course title.")
    description: str | None = Field(description="Course description.")
    level: str | None = Field(description="Difficulty or proficiency level.")
    current_price: int = Field(
        description="Current list price in Toman.",
        examples=[1000000],
    )
    duration_sessions: int | None = Field(
        description="Expected number of sessions, if known."
    )
    total_hours: int | None = Field(
        description="Total course hours, if known.",
        examples=[48],
    )
    session_duration: float | None = Field(
        description="Hours per session, if known.",
        examples=[1.5],
    )
    sessions_per_week: int | None = Field(
        description="Sessions per week, if known.",
        examples=[2],
    )
    is_active: bool = Field(description="Whether the course is offered.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class CourseCreate(BaseModel):
    department_id: int = Field(description="Department that owns this course.")
    title: str = Field(
        min_length=1,
        max_length=255,
        description="Course title.",
        examples=["IELTS Preparation"],
    )
    description: str | None = Field(default=None, description="Course description.")
    level: str | None = Field(
        default=None,
        max_length=100,
        description="Difficulty or proficiency level.",
        examples=["B2"],
    )
    current_price: int = Field(
        gt=0,
        description="List price in Toman. Must be > 0.",
        examples=[1000000],
    )
    duration_sessions: int | None = Field(
        default=None,
        ge=1,
        description="Expected number of sessions. Must be > 0 when set.",
        examples=[24],
    )
    total_hours: int | None = Field(
        default=None,
        ge=1,
        description="Total course hours. Must be > 0 when set.",
        examples=[48],
    )
    session_duration: float | None = Field(
        default=None,
        gt=0,
        description="Hours per session. Must be > 0 when set.",
        examples=[1.5],
    )
    sessions_per_week: int | None = Field(
        default=None,
        ge=1,
        description="Sessions per week. Must be > 0 when set.",
        examples=[2],
    )
    is_active: bool = Field(default=True, description="Whether the course is offered.")


class CourseUpdate(BaseModel):
    department_id: int | None = Field(
        default=None,
        description="Updated owning department.",
    )
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated course title.",
    )
    description: str | None = Field(default=None, description="Updated description.")
    level: str | None = Field(
        default=None,
        max_length=100,
        description="Updated proficiency level.",
    )
    current_price: int | None = Field(
        default=None,
        gt=0,
        description="Updated price in Toman. Must be > 0.",
        examples=[1200000],
    )
    duration_sessions: int | None = Field(
        default=None,
        ge=1,
        description="Updated session count. Must be > 0 when set.",
    )
    total_hours: int | None = Field(
        default=None,
        ge=1,
        description="Updated total course hours. Must be > 0 when set.",
    )
    session_duration: float | None = Field(
        default=None,
        gt=0,
        description="Updated hours per session. Must be > 0 when set.",
    )
    sessions_per_week: int | None = Field(
        default=None,
        ge=1,
        description="Updated sessions per week. Must be > 0 when set.",
    )
    is_active: bool | None = Field(default=None, description="Updated active flag.")
