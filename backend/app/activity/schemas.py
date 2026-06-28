from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.activity.enums import ActivityChannel


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    person_id: int
    channel: ActivityChannel
    action: str
    summary: str
    metadata: dict[str, Any] | None = Field(validation_alias="metadata_")
    org_id: int
    created_at: datetime


class ActivityCreate(BaseModel):
    person_id: int
    channel: ActivityChannel
    action: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    metadata: dict[str, Any] | None = None
