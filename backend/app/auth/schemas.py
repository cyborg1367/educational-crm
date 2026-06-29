from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(
        description="Staff user email address.",
        examples=["admin@example.com"],
    )
    password: str = Field(
        min_length=1,
        description="Account password.",
    )


class TokenResponse(BaseModel):
    access_token: str = Field(description="JWT bearer token for API authentication.")
    token_type: str = Field(
        default="bearer",
        description="Token type. Always 'bearer'.",
    )
