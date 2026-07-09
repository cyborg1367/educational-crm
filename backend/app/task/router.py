from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.task import service as task_service
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.schemas import TaskCreate, TaskRead, TaskUpdate
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[TaskRead])
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    assignee_id: Annotated[
        int | None, Query(description="Filter by assignee user ID.")
    ] = None,
    status: Annotated[
        TaskStatus | None, Query(description="Filter by task status.")
    ] = None,
) -> PaginatedResponse[TaskRead]:
    """List tasks.

    Returns a paginated list of tasks in the organization, optionally filtered by assignee or status.
    """
    items, total_count = task_service.list_tasks(
        db,
        current_user.org_id,
        assignee_id=assignee_id,
        status=status,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
    """Get a task by ID.

    Fetches a single task record from the organization.
    Returns 404 if the task is not found in the org.
    """
    return task_service.get_task(db, current_user.org_id, task_id)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
    """Create a new task.

    Assigns a follow-up or operational task to a person.
    Returns 404 if the person or assignee is not found.
    Returns 422 if request validation fails.
    """
    return task_service.create_task_from_schema(
        db, current_user.org_id, body, actor_id=current_user.id
    )


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    body: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
    """Update a task.

    Applies partial updates to title, due date, assignee, or status.
    Returns 404 if the task or assignee is not found.
    Returns 422 if request validation fails.
    """
    return task_service.update_task(db, current_user.org_id, task_id, body)


@router.post("/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
    """Mark a task as completed.

    Sets task status to completed and records completion timestamp.
    Returns 404 if the task is not found in the org.
    """
    return task_service.complete_task(db, current_user.org_id, task_id)
