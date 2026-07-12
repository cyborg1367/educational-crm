from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.person.enums import PersonStatus

PersonGender = Literal["male", "female", "other"]
PersonInterest = Literal[
    "programming", "ai", "accounting", "english", "graphic", "robotics"
]
PersonSource = Literal[
    "friend_referral", "social_media", "website", "advertisement", "other"
]


class PersonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique person identifier.")
    full_name: str = Field(description="Person's full legal or display name.")
    phone: str | None = Field(description="Contact phone number. Unique per org when set.")
    secondary_phone: str | None = Field(
        description=(
            "Second contact number. Required and treated as a parent/guardian "
            "number when the person is under 18."
        )
    )
    email: EmailStr | None = Field(description="Contact email address.")
    birth_date: date | None = Field(description="Date of birth.")
    gender: PersonGender | None = Field(description="Gender identity.")
    address: str | None = Field(description="Postal or home address.")
    interests: list[PersonInterest] | None = Field(
        description="Selected interest areas."
    )
    interests_note: str | None = Field(description="Additional notes about interests.")
    status: PersonStatus = Field(
        description="Lifecycle status (prospect, lead, student, etc.)."
    )
    source: PersonSource | None = Field(
        description="How this person was acquired (referral, ad, etc.)."
    )
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
    secondary_phone: str | None = Field(
        default=None,
        max_length=50,
        description=(
            "Second contact number. Required when the person is under 18 "
            "(treated as the parent/guardian's number in that case)."
        ),
    )
    email: EmailStr | None = Field(
        default=None,
        description="Contact email address.",
        examples=["ali@example.com"],
    )
    birth_date: date | None = Field(default=None, description="Date of birth.")
    gender: PersonGender | None = Field(default=None, description="Gender identity.")
    address: str | None = Field(default=None, description="Postal or home address.")
    interests: list[PersonInterest] | None = Field(
        default=None,
        description="Selected interest areas.",
    )
    interests_note: str | None = Field(
        default=None,
        description="Additional notes about interests.",
    )
    source: PersonSource | None = Field(
        default=None,
        description="Acquisition channel or referral source.",
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
    secondary_phone: str | None = Field(
        default=None,
        max_length=50,
        description="Updated second/guardian contact number.",
    )
    email: EmailStr | None = Field(default=None, description="Updated email address.")
    birth_date: date | None = Field(default=None, description="Updated date of birth.")
    gender: PersonGender | None = Field(default=None, description="Updated gender.")
    address: str | None = Field(default=None, description="Updated address.")
    interests: list[PersonInterest] | None = Field(
        default=None,
        description="Updated interest areas.",
    )
    interests_note: str | None = Field(
        default=None,
        description="Updated interest notes.",
    )
    status: PersonStatus | None = Field(
        default=None,
        description="Person lifecycle status. Optional — omit to leave unchanged.",
    )
    source: PersonSource | None = Field(
        default=None,
        description="Updated acquisition source.",
    )
    notes: str | None = Field(default=None, description="Updated staff notes.")
