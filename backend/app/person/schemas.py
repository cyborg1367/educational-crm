from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.person.enums import PersonStatus


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str | None
    email: EmailStr | None
    status: PersonStatus
    source: str | None
    notes: str | None
    org_id: int
    created_at: datetime
    updated_at: datetime


class PersonCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    source: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class PersonUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    source: str | None = Field(default=None, max_length=255)
    notes: str | None = None
