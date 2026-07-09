from pydantic import BaseModel, Field, field_validator

from app.core.validators import normalize_staff_email


class LoginRequest(BaseModel):
    email: str = Field(
        description="Staff user email address.",
        examples=["admin@crm.local"],
    )
    password: str = Field(
        min_length=1,
        description="Account password.",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_staff_email(value)


class TokenResponse(BaseModel):
    access_token: str = Field(description="JWT bearer token for API authentication.")
    token_type: str = Field(
        default="bearer",
        description="Token type. Always 'bearer'.",
    )
