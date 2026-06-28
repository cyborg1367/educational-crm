from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.course_class.enums import ClassStatus


class CourseClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    teacher_id: int
    name: str
    start_date: date
    end_date: date | None
    status: ClassStatus
    org_id: int
    created_at: datetime
    updated_at: datetime


class CourseClassCreate(BaseModel):
    course_id: int
    teacher_id: int
    name: str = Field(min_length=1, max_length=255)
    start_date: date
    end_date: date | None = None
    status: ClassStatus = ClassStatus.planned


class CourseClassUpdate(BaseModel):
    course_id: int | None = None
    teacher_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    status: ClassStatus | None = None
