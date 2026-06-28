from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.person import service as person_service
from app.task.model import Task
from app.task.schemas import TaskCreate, TaskUpdate
from app.tenancy.scoping import scoped
from app.user.model import User


def _get_assignee(db: Session, org_id: int, user_id: int) -> User:
    assignee = db.scalars(
        scoped(select(User), User, org_id).where(User.id == user_id)
    ).first()
    if assignee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found"
        )
    return assignee


def list_tasks(db: Session, org_id: int) -> list[Task]:
    stmt = scoped(select(Task), Task, org_id).order_by(
        Task.due_date.asc(), Task.id.asc()
    )
    return list(db.scalars(stmt).all())


def get_task(db: Session, org_id: int, task_id: int) -> Task:
    stmt = scoped(select(Task), Task, org_id).where(Task.id == task_id)
    task = db.scalars(stmt).first()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


def create_task(db: Session, org_id: int, data: TaskCreate) -> Task:
    person_service.get_person(db, org_id, data.person_id)
    if data.assigned_to is not None:
        _get_assignee(db, org_id, data.assigned_to)

    task = Task(
        type=data.type,
        person_id=data.person_id,
        assigned_to=data.assigned_to,
        due_date=data.due_date,
        completed=data.completed,
        notes=data.notes,
        org_id=org_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(
    db: Session, org_id: int, task_id: int, data: TaskUpdate
) -> Task:
    task = get_task(db, org_id, task_id)
    updates = data.model_dump(exclude_unset=True)

    if "assigned_to" in updates and updates["assigned_to"] is not None:
        _get_assignee(db, org_id, updates["assigned_to"])

    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task
