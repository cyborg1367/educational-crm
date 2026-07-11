from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    PRE_ENROLL_FOLLOWUP_DAYS: int = 3
    DORMANT_DAYS: int = 365
    RATE_LIMIT_STORAGE_URI: str = "memory://"
    ENVIRONMENT: str = "development"
    KAVENEGAR_API_KEY: str = ""
    KAVENEGAR_SENDER: str = "EduCRM"
    SMS_ENABLED: bool | None = None
    UPLOAD_DIR: str = "uploads"

    @model_validator(mode="after")
    def default_sms_enabled(self) -> Self:
        if self.SMS_ENABLED is None:
            object.__setattr__(
                self,
                "SMS_ENABLED",
                self.ENVIRONMENT.lower() == "production",
            )
        return self


settings = Settings()
