from typing import TypeVar

from sqlalchemy.sql import Select

T = TypeVar("T")


def scoped(stmt: Select[T], model: type, org_id: int) -> Select[T]:
    """Filter any tenant-owned query by the current organization."""
    return stmt.where(model.org_id == org_id)
