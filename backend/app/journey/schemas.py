from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.journey.enums import JourneyStatus


class JourneyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique journey identifier.")
    person_id: int = Field(description="Person being tracked. Immutable.")
    department_id: int = Field(description="Department context. Immutable.")
    owner_id: int | None = Field(description="Staff user responsible for this journey.")
    roadmap_id: int | None = Field(description="Assigned learning roadmap, if any.")
    status: JourneyStatus = Field(description="Current journey status.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class JourneyCreate(BaseModel):
    person_id: int = Field(description="Person to track in this journey.")
    department_id: int = Field(description="Department for this journey.")
    owner_id: int | None = Field(
        default=None,
        description="Optional staff owner for the journey.",
    )
    roadmap_id: int | None = Field(
        default=None,
        description="Optional roadmap to assign.",
    )
    status: JourneyStatus = Field(
        default=JourneyStatus.active,
        description="Initial journey status.",
    )


class JourneyUpdate(BaseModel):
    owner_id: int | None = Field(default=None, description="Updated journey owner.")
    roadmap_id: int | None = Field(default=None, description="Updated roadmap assignment.")
    status: JourneyStatus | None = Field(default=None, description="Updated status.")
