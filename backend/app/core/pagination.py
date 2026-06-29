from typing import Any, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

DEFAULT_LIMIT = 50
MAX_LIMIT = 500

T = TypeVar("T")


class PaginationParams:
    """Query-parameter pagination with a hard cap on page size."""

    def __init__(
        self,
        limit: int = Query(DEFAULT_LIMIT, ge=1),
        offset: int = Query(0, ge=0),
    ) -> None:
        self.limit = min(limit, MAX_LIMIT)
        self.offset = offset


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(from_attributes=True)

    items: list[T]
    total_count: int
    limit: int
    offset: int
    has_more: bool

    @classmethod
    def from_page(
        cls,
        items: list[T],
        total_count: int,
        *,
        limit: int,
        offset: int,
    ) -> "PaginatedResponse[T]":
        return cls(
            items=items,
            total_count=total_count,
            limit=limit,
            offset=offset,
            has_more=offset + len(items) < total_count,
        )


def paginate_query(
    db: Session,
    stmt: Select[Any],
    *,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    """Return a page of ORM rows and the total matching row count."""
    total_count = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.limit(limit).offset(offset)).all())
    return items, total_count
