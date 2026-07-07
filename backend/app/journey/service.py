from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.pagination import paginate_query
from app.department import service as department_service
from app.journey.model import Journey
from app.journey.schemas import JourneyCreate, JourneyUpdate
from app.person import service as person_service
from app.roadmap import service as roadmap_service
from app.tenancy.scoping import scoped
from app.user import service as user_service


def list_journeys(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Journey], int]:
    stmt = scoped(select(Journey), Journey, org_id).order_by(Journey.id)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_journey(db: Session, org_id: int, journey_id: int) -> Journey:
    stmt = scoped(select(Journey), Journey, org_id).where(Journey.id == journey_id)
    journey = db.scalars(stmt).first()
    if journey is None:
        raise NotFoundError("Journey not found")
    return journey


def _validate_owner(db: Session, org_id: int, owner_id: int | None) -> None:
    if owner_id is not None:
        user_service.get_user(db, org_id, owner_id)


def _validate_person_and_department(
    db: Session, org_id: int, person_id: int, department_id: int
) -> None:
    person_service.get_person(db, org_id, person_id)
    department_service.get_department(db, org_id, department_id)


def _department_roadmap_id(
    db: Session, org_id: int, department_id: int
) -> int:
    roadmap = roadmap_service.ensure_department_roadmap(db, org_id, department_id)
    return roadmap.id


def create_journey(db: Session, org_id: int, data: JourneyCreate) -> Journey:
    _validate_person_and_department(db, org_id, data.person_id, data.department_id)
    _validate_owner(db, org_id, data.owner_id)

    roadmap_id = data.roadmap_id
    if roadmap_id is None:
        roadmap_id = _department_roadmap_id(db, org_id, data.department_id)

    journey = Journey(
        person_id=data.person_id,
        department_id=data.department_id,
        owner_id=data.owner_id,
        roadmap_id=roadmap_id,
        status=data.status,
        org_id=org_id,
    )
    db.add(journey)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            "Journey already exists for this person and department"
        ) from None
    db.refresh(journey)
    return journey


def update_journey(
    db: Session, org_id: int, journey_id: int, data: JourneyUpdate
) -> Journey:
    journey = get_journey(db, org_id, journey_id)
    updates = data.model_dump(exclude_unset=True)

    if "owner_id" in updates:
        _validate_owner(db, org_id, updates["owner_id"])

    for field, value in updates.items():
        setattr(journey, field, value)

    db.commit()
    db.refresh(journey)
    return journey


def get_or_create_journey(
    db: Session, org_id: int, person_id: int, department_id: int
) -> Journey:
    _validate_person_and_department(db, org_id, person_id, department_id)

    stmt = scoped(select(Journey), Journey, org_id).where(
        Journey.person_id == person_id,
        Journey.department_id == department_id,
    )
    journey = db.scalars(stmt).first()
    if journey is not None:
        if journey.roadmap_id is None:
            journey.roadmap_id = _department_roadmap_id(
                db, org_id, department_id
            )
            db.commit()
            db.refresh(journey)
        return journey

    journey = Journey(
        person_id=person_id,
        department_id=department_id,
        roadmap_id=_department_roadmap_id(db, org_id, department_id),
        org_id=org_id,
    )
    db.add(journey)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        journey = db.scalars(stmt).first()
        if journey is None:
            raise
        return journey
    db.refresh(journey)
    return journey
