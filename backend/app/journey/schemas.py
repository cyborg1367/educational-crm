from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.journey.enums import JourneyStatus


class JourneyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    department_id: int
    owner_id: int | None
    roadmap_id: int | None
    status: JourneyStatus
    org_id: int
    created_at: datetime
    updated_at: datetime


class JourneyCreate(BaseModel):
    person_id: int
    department_id: int
    owner_id: int | None = None
    roadmap_id: int | None = None
    status: JourneyStatus = JourneyStatus.active


class JourneyUpdate(BaseModel):
    owner_id: int | None = None
    roadmap_id: int | None = None
    status: JourneyStatus | None = None
