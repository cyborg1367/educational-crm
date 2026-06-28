from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.department import service as department_service
from app.department.model import Department
from app.department.schemas import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[DepartmentRead])
def list_departments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Department]:
    return department_service.list_departments(db, current_user.org_id)


@router.get("/{department_id}", response_model=DepartmentRead)
def get_department(
    department_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Department:
    return department_service.get_department(db, current_user.org_id, department_id)


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    body: DepartmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Department:
    return department_service.create_department(db, current_user.org_id, body)


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    body: DepartmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Department:
    return department_service.update_department(
        db, current_user.org_id, department_id, body
    )
