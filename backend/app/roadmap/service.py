from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.course import service as course_service
from app.department import service as department_service
from app.roadmap.model import Roadmap, RoadmapItem
from app.roadmap.schemas import (
    RoadmapCreate,
    RoadmapItemCreate,
    RoadmapItemUpdate,
    RoadmapUpdate,
)
from app.tenancy.scoping import scoped


def list_roadmaps(db: Session, org_id: int) -> list[Roadmap]:
    stmt = scoped(select(Roadmap), Roadmap, org_id).order_by(Roadmap.name)
    return list(db.scalars(stmt).all())


def get_roadmap(db: Session, org_id: int, roadmap_id: int) -> Roadmap:
    stmt = scoped(select(Roadmap), Roadmap, org_id).where(Roadmap.id == roadmap_id)
    roadmap = db.scalars(stmt).first()
    if roadmap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found"
        )
    return roadmap


def _validate_department(db: Session, org_id: int, department_id: int) -> None:
    department_service.get_department(db, org_id, department_id)


def create_roadmap(db: Session, org_id: int, data: RoadmapCreate) -> Roadmap:
    _validate_department(db, org_id, data.department_id)

    roadmap = Roadmap(
        department_id=data.department_id,
        name=data.name,
        is_active=data.is_active,
        org_id=org_id,
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    return roadmap


def update_roadmap(
    db: Session, org_id: int, roadmap_id: int, data: RoadmapUpdate
) -> Roadmap:
    roadmap = get_roadmap(db, org_id, roadmap_id)
    updates = data.model_dump(exclude_unset=True)

    if "department_id" in updates:
        _validate_department(db, org_id, updates["department_id"])

    for field, value in updates.items():
        setattr(roadmap, field, value)

    db.commit()
    db.refresh(roadmap)
    return roadmap


def list_roadmap_items(
    db: Session, org_id: int, roadmap_id: int
) -> list[RoadmapItem]:
    get_roadmap(db, org_id, roadmap_id)
    stmt = (
        scoped(select(RoadmapItem), RoadmapItem, org_id)
        .where(RoadmapItem.roadmap_id == roadmap_id)
        .order_by(RoadmapItem.sequence)
    )
    return list(db.scalars(stmt).all())


def get_roadmap_item(
    db: Session, org_id: int, roadmap_id: int, item_id: int
) -> RoadmapItem:
    get_roadmap(db, org_id, roadmap_id)
    stmt = (
        scoped(select(RoadmapItem), RoadmapItem, org_id)
        .where(
            RoadmapItem.id == item_id,
            RoadmapItem.roadmap_id == roadmap_id,
        )
    )
    item = db.scalars(stmt).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap item not found"
        )
    return item


def _validate_course(db: Session, org_id: int, course_id: int | None) -> None:
    if course_id is not None:
        course_service.get_course(db, org_id, course_id)


def create_roadmap_item(
    db: Session, org_id: int, roadmap_id: int, data: RoadmapItemCreate
) -> RoadmapItem:
    get_roadmap(db, org_id, roadmap_id)
    _validate_course(db, org_id, data.course_id)

    item = RoadmapItem(
        roadmap_id=roadmap_id,
        title=data.title,
        sequence=data.sequence,
        course_id=data.course_id,
        org_id=org_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_roadmap_item(
    db: Session,
    org_id: int,
    roadmap_id: int,
    item_id: int,
    data: RoadmapItemUpdate,
) -> RoadmapItem:
    item = get_roadmap_item(db, org_id, roadmap_id, item_id)
    updates = data.model_dump(exclude_unset=True)

    if "course_id" in updates:
        _validate_course(db, org_id, updates["course_id"])

    for field, value in updates.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item
