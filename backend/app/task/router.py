from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.task import service as task_service
from app.task.enums import TaskStatus
from app.task.model import Task
from app.task.schemas import TaskCreate, TaskRead, TaskUpdate
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[TaskRead])
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    assignee_id: Annotated[int | None, Query()] = None,
    status: Annotated[TaskStatus | None, Query()] = None,
) -> list[Task]:
    return task_service.list_tasks(
        db, current_user.org_id, assignee_id=assignee_id, status=status
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
    return task_service.get_task(db, current_user.org_id, task_id)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
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
    return task_service.update_task(db, current_user.org_id, task_id, body)


@router.post("/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Task:
    return task_service.complete_task(db, current_user.org_id, task_id)
