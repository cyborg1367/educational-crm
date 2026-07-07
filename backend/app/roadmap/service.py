from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.pagination import paginate_query
from app.course import service as course_service
from app.course.model import Course
from app.department import service as department_service
from app.roadmap.model import Roadmap, RoadmapItem
from app.roadmap.schemas import (
    RoadmapCreate,
    RoadmapItemCreate,
    RoadmapItemUpdate,
    RoadmapUpdate,
)
from app.tenancy.scoping import scoped

_AUTO_MANAGED_MSG = (
    "Roadmaps are automatically generated from department courses and prerequisites"
)


def list_roadmaps(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Roadmap], int]:
    stmt = scoped(select(Roadmap), Roadmap, org_id).order_by(Roadmap.name)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_roadmap(db: Session, org_id: int, roadmap_id: int) -> Roadmap:
    stmt = scoped(select(Roadmap), Roadmap, org_id).where(Roadmap.id == roadmap_id)
    roadmap = db.scalars(stmt).first()
    if roadmap is None:
        raise NotFoundError("Roadmap not found")
    return roadmap


def _raise_auto_managed() -> None:
    raise ValidationError(_AUTO_MANAGED_MSG)


def get_roadmap_for_department(
    db: Session, org_id: int, department_id: int
) -> Roadmap | None:
    stmt = scoped(select(Roadmap), Roadmap, org_id).where(
        Roadmap.department_id == department_id
    )
    return db.scalars(stmt).first()


def _topological_course_order(courses: list[Course]) -> list[Course]:
    by_id = {course.id: course for course in courses}
    in_degree = {
        course.id: sum(
            1 for prereq in course.prerequisites if prereq.id in by_id
        )
        for course in courses
    }
    dependents: dict[int, list[Course]] = {course.id: [] for course in courses}
    for course in courses:
        for prereq in course.prerequisites:
            if prereq.id in by_id:
                dependents[prereq.id].append(course)

    ready = sorted(
        [course for course in courses if in_degree[course.id] == 0],
        key=lambda course: course.title,
    )
    ordered: list[Course] = []
    while ready:
        course = ready.pop(0)
        ordered.append(course)
        newly_ready: list[Course] = []
        for dependent in dependents[course.id]:
            in_degree[dependent.id] -= 1
            if in_degree[dependent.id] == 0:
                newly_ready.append(dependent)
        ready.extend(newly_ready)
        ready.sort(key=lambda item: item.title)

    if len(ordered) != len(courses):
        remaining = [course for course in courses if course not in ordered]
        ordered.extend(sorted(remaining, key=lambda course: course.title))
    return ordered


def ensure_department_roadmap(
    db: Session, org_id: int, department_id: int
) -> Roadmap:
    department = department_service.get_department(db, org_id, department_id)
    roadmap = get_roadmap_for_department(db, org_id, department_id)
    if roadmap is None:
        roadmap = Roadmap(
            department_id=department_id,
            name=department.name,
            is_active=True,
            org_id=org_id,
        )
        db.add(roadmap)
        db.flush()
        return roadmap

    if roadmap.name != department.name:
        roadmap.name = department.name
    return roadmap


def sync_department_roadmap(
    db: Session, org_id: int, department_id: int
) -> Roadmap:
    roadmap = ensure_department_roadmap(db, org_id, department_id)
    courses = course_service.get_department_roadmap(db, org_id, department_id)
    ordered = _topological_course_order(courses)

    db.execute(
        delete(RoadmapItem).where(
            RoadmapItem.org_id == org_id,
            RoadmapItem.roadmap_id == roadmap.id,
        )
    )

    for sequence, course in enumerate(ordered, start=1):
        db.add(
            RoadmapItem(
                roadmap_id=roadmap.id,
                title=course.title,
                sequence=sequence,
                course_id=course.id,
                org_id=org_id,
            )
        )

    db.flush()
    return roadmap


def create_roadmap(db: Session, org_id: int, data: RoadmapCreate) -> Roadmap:
    _raise_auto_managed()


def update_roadmap(
    db: Session, org_id: int, roadmap_id: int, data: RoadmapUpdate
) -> Roadmap:
    _raise_auto_managed()


def delete_roadmap(db: Session, org_id: int, roadmap_id: int) -> None:
    _raise_auto_managed()


def list_roadmap_items(
    db: Session,
    org_id: int,
    roadmap_id: int,
    *,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[RoadmapItem], int]:
    get_roadmap(db, org_id, roadmap_id)
    stmt = (
        scoped(select(RoadmapItem), RoadmapItem, org_id)
        .where(RoadmapItem.roadmap_id == roadmap_id)
        .order_by(RoadmapItem.sequence)
    )
    return paginate_query(db, stmt, limit=limit, offset=offset)


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
        raise NotFoundError("Roadmap item not found")
    return item


def create_roadmap_item(
    db: Session, org_id: int, roadmap_id: int, data: RoadmapItemCreate
) -> RoadmapItem:
    _raise_auto_managed()


def update_roadmap_item(
    db: Session,
    org_id: int,
    roadmap_id: int,
    item_id: int,
    data: RoadmapItemUpdate,
) -> RoadmapItem:
    _raise_auto_managed()


def delete_roadmap_item(
    db: Session, org_id: int, roadmap_id: int, item_id: int
) -> None:
    _raise_auto_managed()
