from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.pagination import paginate_query
from app.department.model import Department
from app.department.schemas import DepartmentCreate, DepartmentUpdate
from app.tenancy.scoping import scoped
from app.user import service as user_service


def list_departments(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Department], int]:
    stmt = scoped(select(Department), Department, org_id).order_by(Department.name)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_department(db: Session, org_id: int, department_id: int) -> Department:
    stmt = scoped(select(Department), Department, org_id).where(
        Department.id == department_id
    )
    department = db.scalars(stmt).first()
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    return department


def _validate_manager(db: Session, org_id: int, manager_id: int | None) -> None:
    if manager_id is not None:
        user_service.get_user(db, org_id, manager_id)


def create_department(
    db: Session, org_id: int, data: DepartmentCreate
) -> Department:
    _validate_manager(db, org_id, data.manager_id)

    department = Department(
        name=data.name,
        manager_id=data.manager_id,
        is_active=data.is_active,
        org_id=org_id,
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


def update_department(
    db: Session, org_id: int, department_id: int, data: DepartmentUpdate
) -> Department:
    department = get_department(db, org_id, department_id)
    updates = data.model_dump(exclude_unset=True)

    if "manager_id" in updates:
        _validate_manager(db, org_id, updates["manager_id"])

    for field, value in updates.items():
        setattr(department, field, value)

    db.commit()
    db.refresh(department)
    return department
