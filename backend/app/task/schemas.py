from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.task.enums import TaskStatus, TaskType


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique task identifier.")
    person_id: int = Field(description="Person this task relates to.")
    type: TaskType = Field(description="Task category (follow-up, registration, etc.).")
    title: str = Field(description="Short task title.")
    description: str | None = Field(description="Detailed task description.")
    due_date: date = Field(description="Date the task is due.")
    assignee_id: int | None = Field(description="Assigned staff user, if any.")
    status: TaskStatus = Field(description="Current task status.")
    related_entity_type: str | None = Field(
        description="Optional linked entity type (e.g. consultation)."
    )
    related_entity_id: int | None = Field(
        description="Optional linked entity ID."
    )
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    completed_at: datetime | None = Field(
        description="When the task was completed, if applicable."
    )


class TaskCreate(BaseModel):
    person_id: int = Field(description="Person this task relates to.")
    type: TaskType = Field(description="Task category.")
    title: str = Field(
        description="Short task title.",
        examples=["Follow up on registration"],
    )
    due_date: date = Field(description="Date the task is due.")
    description: str | None = Field(
        default=None,
        description="Detailed task description.",
    )
    assignee_id: int | None = Field(
        default=None,
        description="Staff user to assign the task to.",
    )
    related_entity_type: str | None = Field(
        default=None,
        description="Optional linked entity type.",
        examples=["consultation"],
    )
    related_entity_id: int | None = Field(
        default=None,
        description="Optional linked entity ID.",
    )


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, description="Updated task title.")
    description: str | None = Field(default=None, description="Updated description.")
    due_date: date | None = Field(default=None, description="Updated due date.")
    assignee_id: int | None = Field(default=None, description="Updated assignee.")
    status: TaskStatus | None = Field(default=None, description="Updated status.")
