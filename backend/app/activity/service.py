from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity.enums import ActivityChannel
from app.activity.model import Activity
from app.activity.schemas import ActivityCreate
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
    channel: ActivityChannel,
    action: str,
    summary: str,
    metadata: dict[str, Any] | None = None,
) -> Activity:
    person_service.get_person(db, org_id, person_id)

    activity = Activity(
        person_id=person_id,
        channel=channel,
        action=action,
        summary=summary,
        metadata_=metadata,
        org_id=org_id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def create_activity(db: Session, org_id: int, data: ActivityCreate) -> Activity:
    return log_activity(
        db,
        org_id,
        data.person_id,
        data.channel,
        data.action,
        data.summary,
        data.metadata,
    )
