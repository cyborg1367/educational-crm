from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity.model import Activity
from app.person import service as person_service
from app.tenancy.scoping import scoped


def list_activities(
    db: Session, org_id: int, *, person_id: int | None = None
) -> list[Activity]:
    stmt = scoped(select(Activity), Activity, org_id).order_by(
        Activity.created_at.desc()
    )
    if person_id is not None:
        stmt = stmt.where(Activity.person_id == person_id)
    return list(db.scalars(stmt).all())


def log_activity(
    db: Session,
    org_id: int,
    person_id: int,
    action: str,
    payload: dict | None = None,
    actor_id: int | None = None,
) -> Activity:
    person_service.get_person(db, org_id, person_id)

    activity = Activity(
        person_id=person_id,
        action=action,
        payload=payload,
        actor_id=actor_id,
        org_id=org_id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity
