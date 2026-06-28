from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    action: str
    payload: dict | None
    actor_id: int | None
    org_id: int
    created_at: datetime


class ActivityCreate(BaseModel):
    person_id: int
    action: str
    payload: dict | None = None
    actor_id: int | None = None
