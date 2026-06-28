from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoadmapRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    name: str
    is_active: bool
    org_id: int
    created_at: datetime
    updated_at: datetime


class RoadmapCreate(BaseModel):
    department_id: int
    name: str = Field(min_length=1, max_length=255)
    is_active: bool = True


class RoadmapUpdate(BaseModel):
    department_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class RoadmapItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    roadmap_id: int
    title: str
    sequence: int
    course_id: int | None
    org_id: int
    created_at: datetime
    updated_at: datetime


class RoadmapItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    sequence: int = Field(ge=0)
    course_id: int | None = None


class RoadmapItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    sequence: int | None = Field(default=None, ge=0)
    course_id: int | None = None
