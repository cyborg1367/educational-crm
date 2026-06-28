from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.task.enums import TaskType


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TaskType
    person_id: int
    assigned_to: int | None
    due_date: date
    completed: bool
    notes: str | None
    org_id: int
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    type: TaskType
    person_id: int
    assigned_to: int | None = None
    due_date: date
    completed: bool = False
    notes: str | None = None


class TaskUpdate(BaseModel):
    type: TaskType | None = None
    assigned_to: int | None = None
    due_date: date | None = None
    completed: bool | None = None
    notes: str | None = None
