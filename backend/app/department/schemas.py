from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DepartmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique department identifier.")
    name: str = Field(description="Department display name.")
    manager_id: int | None = Field(
        description="User ID of the department manager, if assigned."
    )
    is_active: bool = Field(description="Whether the department accepts new activity.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class DepartmentCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Department display name.",
        examples=["English Department"],
    )
    manager_id: int | None = Field(
        default=None,
        description="Optional user ID of the department manager.",
    )
    is_active: bool = Field(
        default=True,
        description="Whether the department is active.",
    )


class DepartmentUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated department name.",
    )
    manager_id: int | None = Field(
        default=None,
        description="Updated manager user ID.",
    )
    is_active: bool | None = Field(
        default=None,
        description="Updated active flag.",
    )
