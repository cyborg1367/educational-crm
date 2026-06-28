from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.communication.enums import CommunicationChannel, CommunicationDirection


class CommunicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    person_id: int
    channel: CommunicationChannel
    direction: CommunicationDirection
    content: str
    metadata: dict[str, Any] | None = Field(validation_alias="metadata_")
    org_id: int
    created_at: datetime
    updated_at: datetime


class CommunicationCreate(BaseModel):
    person_id: int
    channel: CommunicationChannel
    direction: CommunicationDirection
    content: str = Field(min_length=1)
    metadata: dict[str, Any] | None = None
