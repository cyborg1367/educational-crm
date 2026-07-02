from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validators import normalize_staff_email
from app.user.enums import UserRole


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique organization identifier.")
    name: str = Field(description="Organization display name.")
    is_active: bool = Field(description="Whether the organization is active.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique user identifier.")
    name: str = Field(description="Staff display name.")
    email: str = Field(description="Login email. Unique per org.")
    role: UserRole = Field(description="Staff role (admin, teacher, consultant, etc.).")
    department_id: int | None = Field(
        description="Primary department assignment, if any."
    )
    is_active: bool = Field(description="Whether the account can log in.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class UserCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Staff display name.",
        examples=["Sara Mohammadi"],
    )
    email: str = Field(
        description="Login email. Unique per org.",
        examples=["admin@crm.local"],
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Initial password. Minimum 8 characters.",
    )
    role: UserRole = Field(description="Staff role.")
    department_id: int | None = Field(
        default=None,
        description="Optional primary department assignment.",
    )
    is_active: bool = Field(default=True, description="Whether the account is active.")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_staff_email(value)


class UserUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated display name.",
    )
    email: str | None = Field(
        default=None,
        description="Updated email. Unique per org.",
    )
    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
        description="New password. Minimum 8 characters when set.",
    )
    role: UserRole | None = Field(default=None, description="Updated role.")
    department_id: int | None = Field(
        default=None,
        description="Updated department assignment.",
    )
    is_active: bool | None = Field(default=None, description="Updated active flag.")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_staff_email(value)
