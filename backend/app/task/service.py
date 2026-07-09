from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.core.errors import NotFoundError
from app.core.pagination import paginate_query
from app.person import service as person_service
from app.task.enums import TaskStatus, TaskType
from app.task.model import Task
from app.task.schemas import TaskCreate, TaskUpdate
from app.tenancy.scoping import scoped
from app.user import service as user_service


def list_tasks(
    db: Session,
    org_id: int,
    *,
    assignee_id: int | None = None,
    status: TaskStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Task], int]:
    stmt = scoped(select(Task), Task, org_id).order_by(Task.due_date, Task.id)
    if assignee_id is not None:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_task(db: Session, org_id: int, task_id: int) -> Task:
    stmt = scoped(select(Task), Task, org_id).where(Task.id == task_id)
    task = db.scalars(stmt).first()
    if task is None:
        raise NotFoundError("Task not found")
    return task


def create_task(
    db: Session,
    org_id: int,
    *,
    person_id: int,
    task_type: TaskType,
    title: str,
    due_date: date,
    description: str | None = None,
    assignee_id: int | None = None,
    related_entity_type: str | None = None,
    related_entity_id: int | None = None,
    actor_id: int | None = None,
) -> Task:
    person_service.get_person(db, org_id, person_id)
    if assignee_id is not None:
        user_service.get_user(db, org_id, assignee_id)

    task = Task(
        person_id=person_id,
        type=task_type,
        title=title,
        description=description,
        due_date=due_date,
        assignee_id=assignee_id,
        status=TaskStatus.open,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        org_id=org_id,
    )
    db.add(task)
    db.flush()

    activity_service.log_activity(
        db,
        org_id,
        person_id,
        "task_created",
        payload={
            "task_id": task.id,
            "task_type": task_type.value,
            "title": title,
            "due_date": due_date.isoformat(),
        },
        actor_id=actor_id,
    )
    return task


def create_task_from_schema(
    db: Session, org_id: int, data: TaskCreate, *, actor_id: int | None = None
) -> Task:
    return create_task(
        db,
        org_id,
        person_id=data.person_id,
        task_type=data.type,
        title=data.title,
        due_date=data.due_date,
        description=data.description,
        assignee_id=data.assignee_id,
        related_entity_type=data.related_entity_type,
        related_entity_id=data.related_entity_id,
        actor_id=actor_id,
    )


def update_task(
    db: Session, org_id: int, task_id: int, data: TaskUpdate
) -> Task:
    task = get_task(db, org_id, task_id)
    updates = data.model_dump(exclude_unset=True)

    if "assignee_id" in updates and updates["assignee_id"] is not None:
        user_service.get_user(db, org_id, updates["assignee_id"])

    if updates.get("status") == TaskStatus.done and task.completed_at is None:
        task.completed_at = datetime.now(timezone.utc)
    elif updates.get("status") in (TaskStatus.open, TaskStatus.cancelled):
        task.completed_at = None

    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def complete_task(db: Session, org_id: int, task_id: int) -> Task:
    return update_task(
        db, org_id, task_id, TaskUpdate(status=TaskStatus.done)
    )
