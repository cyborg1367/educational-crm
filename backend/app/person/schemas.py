from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.person.enums import PersonStatus


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique person identifier.")
    full_name: str = Field(description="Person's full legal or display name.")
    phone: str | None = Field(description="Contact phone number. Unique per org when set.")
    email: EmailStr | None = Field(description="Contact email address.")
    status: PersonStatus = Field(
        description="Lifecycle status (prospect, lead, student, etc.)."
    )
    source: str | None = Field(description="How this person was acquired (referral, ad, etc.).")
    notes: str | None = Field(description="Free-form staff notes.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class PersonCreate(BaseModel):
    full_name: str = Field(
        min_length=1,
        max_length=255,
        description="Person's full name.",
        examples=["Ali Rezaei"],
    )
    phone: str | None = Field(
        default=None,
        max_length=50,
        description="Contact phone. Unique per org when set.",
        examples=["09121234567"],
    )
    email: EmailStr | None = Field(
        default=None,
        description="Contact email address.",
        examples=["ali@example.com"],
    )
    source: str | None = Field(
        default=None,
        max_length=255,
        description="Acquisition channel or referral source.",
        examples=["Instagram ad"],
    )
    notes: str | None = Field(default=None, description="Optional staff notes.")


class PersonUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated full name.",
    )
    phone: str | None = Field(
        default=None,
        max_length=50,
        description="Updated phone. Unique per org when set.",
    )
    email: EmailStr | None = Field(default=None, description="Updated email address.")
    source: str | None = Field(
        default=None,
        max_length=255,
        description="Updated acquisition source.",
    )
    notes: str | None = Field(default=None, description="Updated staff notes.")
