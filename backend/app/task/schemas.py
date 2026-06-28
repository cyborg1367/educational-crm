from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.task.enums import TaskStatus, TaskType


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    type: TaskType
    title: str
    description: str | None
    due_date: date
    assignee_id: int | None
    status: TaskStatus
    related_entity_type: str | None
    related_entity_id: int | None
    org_id: int
    created_at: datetime
    completed_at: datetime | None


class TaskCreate(BaseModel):
    person_id: int
    type: TaskType
    title: str
    due_date: date
    description: str | None = None
    assignee_id: int | None = None
    related_entity_type: str | None = None
    related_entity_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: date | None = None
    assignee_id: int | None = None
    status: TaskStatus | None = None
