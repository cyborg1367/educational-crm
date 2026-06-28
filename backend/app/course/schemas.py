from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    title: str
    description: str | None
    level: str | None
    current_price: int
    duration_sessions: int | None
    is_active: bool
    org_id: int
    created_at: datetime
    updated_at: datetime


class CourseCreate(BaseModel):
    department_id: int
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    level: str | None = Field(default=None, max_length=100)
    current_price: int = Field(ge=0)
    duration_sessions: int | None = Field(default=None, ge=1)
    is_active: bool = True


class CourseUpdate(BaseModel):
    department_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    level: str | None = Field(default=None, max_length=100)
    current_price: int | None = Field(default=None, ge=0)
    duration_sessions: int | None = Field(default=None, ge=1)
    is_active: bool | None = None
