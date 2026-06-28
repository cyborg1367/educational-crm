from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.roadmap import service as roadmap_service
from app.roadmap.model import Roadmap, RoadmapItem
from app.roadmap.schemas import (
    RoadmapCreate,
    RoadmapItemCreate,
    RoadmapItemRead,
    RoadmapItemUpdate,
    RoadmapRead,
    RoadmapUpdate,
)
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[RoadmapRead])
def list_roadmaps(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Roadmap]:
    return roadmap_service.list_roadmaps(db, current_user.org_id)


@router.get("/{roadmap_id}", response_model=RoadmapRead)
def get_roadmap(
    roadmap_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Roadmap:
    return roadmap_service.get_roadmap(db, current_user.org_id, roadmap_id)


@router.post("", response_model=RoadmapRead, status_code=status.HTTP_201_CREATED)
def create_roadmap(
    body: RoadmapCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Roadmap:
    return roadmap_service.create_roadmap(db, current_user.org_id, body)


@router.patch("/{roadmap_id}", response_model=RoadmapRead)
def update_roadmap(
    roadmap_id: int,
    body: RoadmapUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Roadmap:
    return roadmap_service.update_roadmap(db, current_user.org_id, roadmap_id, body)


@router.get("/{roadmap_id}/items", response_model=list[RoadmapItemRead])
def list_roadmap_items(
    roadmap_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[RoadmapItem]:
    return roadmap_service.list_roadmap_items(db, current_user.org_id, roadmap_id)


@router.get("/{roadmap_id}/items/{item_id}", response_model=RoadmapItemRead)
def get_roadmap_item(
    roadmap_id: int,
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RoadmapItem:
    return roadmap_service.get_roadmap_item(
        db, current_user.org_id, roadmap_id, item_id
    )


@router.post(
    "/{roadmap_id}/items",
    response_model=RoadmapItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_roadmap_item(
    roadmap_id: int,
    body: RoadmapItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RoadmapItem:
    return roadmap_service.create_roadmap_item(
        db, current_user.org_id, roadmap_id, body
    )


@router.patch("/{roadmap_id}/items/{item_id}", response_model=RoadmapItemRead)
def update_roadmap_item(
    roadmap_id: int,
    item_id: int,
    body: RoadmapItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RoadmapItem:
    return roadmap_service.update_roadmap_item(
        db, current_user.org_id, roadmap_id, item_id, body
    )
