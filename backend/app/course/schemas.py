from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique course identifier.")
    department_id: int = Field(description="Department that owns this course.")
    title: str = Field(description="Course title.")
    description: str | None = Field(description="Course description.")
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
    prerequisite_ids: list[int] = Field(
        default_factory=list,
        description="IDs of prerequisite courses in the same department.",
    )
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")

    @model_validator(mode="before")
    @classmethod
    def populate_prerequisite_ids(cls, data: Any) -> Any:
        if hasattr(data, "prerequisites"):
            prereqs = data.prerequisites
            return {
                **{
                    key: getattr(data, key)
                    for key in (
                        "id",
                        "department_id",
                        "title",
                        "description",
                        "current_price",
                        "duration_sessions",
                        "total_hours",
                        "session_duration",
                        "sessions_per_week",
                        "is_active",
                        "org_id",
                        "created_at",
                        "updated_at",
                    )
                },
                "prerequisite_ids": [prereq.id for prereq in prereqs],
            }
        return data


class CourseCreate(BaseModel):
    department_id: int = Field(description="Department that owns this course.")
    title: str = Field(
        min_length=1,
        max_length=255,
        description="Course title.",
        examples=["IELTS Preparation"],
    )
    description: str | None = Field(default=None, description="Course description.")
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
    prerequisite_ids: list[int] = Field(
        default_factory=list,
        description="Prerequisite course IDs in the same department.",
    )


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
    prerequisite_ids: list[int] | None = Field(
        default=None,
        description="Updated prerequisite course IDs in the same department.",
    )


class DepartmentRoadmapResponse(BaseModel):
    courses: list[CourseRead] = Field(
        description="Active courses in the department with prerequisite links."
    )
