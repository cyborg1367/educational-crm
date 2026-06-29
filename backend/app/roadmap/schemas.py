from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoadmapRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique roadmap identifier.")
    department_id: int = Field(description="Department that owns this roadmap.")
    name: str = Field(description="Roadmap display name.")
    is_active: bool = Field(description="Whether the roadmap is in use.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class RoadmapCreate(BaseModel):
    department_id: int = Field(description="Department that owns this roadmap.")
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Roadmap display name.",
        examples=["General English Path"],
    )
    is_active: bool = Field(default=True, description="Whether the roadmap is active.")


class RoadmapUpdate(BaseModel):
    department_id: int | None = Field(
        default=None,
        description="Updated owning department.",
    )
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated roadmap name.",
    )
    is_active: bool | None = Field(default=None, description="Updated active flag.")


class RoadmapItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique roadmap item identifier.")
    roadmap_id: int = Field(description="Parent roadmap. Immutable.")
    title: str = Field(description="Step title.")
    sequence: int = Field(description="Order within the roadmap (0-based).")
    course_id: int | None = Field(description="Linked course, if this step maps to one.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class RoadmapItemCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=255,
        description="Step title.",
        examples=["Foundation Grammar"],
    )
    sequence: int = Field(
        ge=0,
        description="Order within the roadmap. Must be >= 0.",
        examples=[0],
    )
    course_id: int | None = Field(
        default=None,
        description="Optional linked course for this step.",
    )


class RoadmapItemUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated step title.",
    )
    sequence: int | None = Field(
        default=None,
        ge=0,
        description="Updated order. Must be >= 0 when set.",
    )
    course_id: int | None = Field(
        default=None,
        description="Updated linked course.",
    )
