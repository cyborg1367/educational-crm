from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.communication.enums import CommunicationChannel, CommunicationDirection


class CommunicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int = Field(description="Unique communication identifier.")
    person_id: int = Field(description="Person involved in the communication.")
    channel: CommunicationChannel = Field(
        description="Channel used (phone, email, SMS, etc.)."
    )
    direction: CommunicationDirection = Field(
        description="Whether inbound or outbound."
    )
    content: str = Field(description="Message or call summary.")
    metadata: dict[str, Any] | None = Field(
        validation_alias="metadata_",
        description="Optional channel-specific metadata.",
    )
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class CommunicationCreate(BaseModel):
    person_id: int = Field(description="Person involved in the communication.")
    channel: CommunicationChannel = Field(
        description="Channel used (phone, email, SMS, etc.)."
    )
    direction: CommunicationDirection = Field(
        description="Whether inbound or outbound."
    )
    content: str = Field(
        min_length=1,
        description="Message or call summary.",
        examples=["Called to confirm class schedule."],
    )
    metadata: dict[str, Any] | None = Field(
        default=None,
        description="Optional channel-specific metadata (duration, message ID, etc.).",
    )
