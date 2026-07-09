from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique activity identifier.")
    person_id: int = Field(description="Person this event relates to.")
    action: str = Field(description="Event action key (e.g. enrollment.created).")
    payload: dict | None = Field(description="Optional structured event data.")
    actor_id: int | None = Field(description="User who triggered the event, if known.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(
        description="When the event occurred (UTC). Immutable."
    )


class ActivityCreate(BaseModel):
    person_id: int = Field(description="Person this event relates to.")
    action: str = Field(
        description="Event action key.",
        examples=["note.added"],
    )
    payload: dict | None = Field(
        default=None,
        description="Optional structured event data.",
    )
    actor_id: int | None = Field(
        default=None,
        description="User who triggered the event. Defaults to current user.",
    )
