from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
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

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[RoadmapRead])
def list_roadmaps(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[RoadmapRead]:
    """List roadmaps.

    Returns a paginated list of learning roadmaps in the organization.
    """
    items, total_count = roadmap_service.list_roadmaps(
        db,
        current_user.org_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{roadmap_id}", response_model=RoadmapRead)
def get_roadmap(
    roadmap_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Roadmap:
    """Get a roadmap by ID.

    Fetches a single roadmap and its metadata.
    Returns 404 if the roadmap is not found in the org.
    """
    return roadmap_service.get_roadmap(db, current_user.org_id, roadmap_id)


@router.post("", response_model=RoadmapRead, status_code=status.HTTP_201_CREATED)
def create_roadmap(
    body: RoadmapCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Roadmap:
    """Create a new roadmap.

    Defines a structured learning path for a department.
    Returns 404 if the department is not found.
    Returns 422 if request validation fails.
    """
    return roadmap_service.create_roadmap(db, current_user.org_id, body)


@router.patch("/{roadmap_id}", response_model=RoadmapRead)
def update_roadmap(
    roadmap_id: int,
    body: RoadmapUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Roadmap:
    """Update a roadmap.

    Applies partial updates to an existing roadmap.
    Returns 404 if the roadmap or department is not found.
    Returns 422 if request validation fails.
    """
    return roadmap_service.update_roadmap(db, current_user.org_id, roadmap_id, body)


@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap(
    roadmap_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """Delete a roadmap.

    Removes the roadmap, its items, and clears journey references.
    Returns 404 if the roadmap is not found in the org.
    """
    roadmap_service.delete_roadmap(db, current_user.org_id, roadmap_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{roadmap_id}/items", response_model=PaginatedResponse[RoadmapItemRead])
def list_roadmap_items(
    roadmap_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[RoadmapItemRead]:
    """List roadmap items.

    Returns a paginated list of ordered steps for a roadmap.
    Returns 404 if the roadmap is not found in the org.
    """
    items, total_count = roadmap_service.list_roadmap_items(
        db,
        current_user.org_id,
        roadmap_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{roadmap_id}/items/{item_id}", response_model=RoadmapItemRead)
def get_roadmap_item(
    roadmap_id: int,
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RoadmapItem:
    """Get a roadmap item by ID.

    Fetches a single step within a roadmap.
    Returns 404 if the roadmap or item is not found in the org.
    """
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
    """Create a roadmap item.

    Adds a step to an existing roadmap.
    Returns 404 if the roadmap or linked course is not found.
    Returns 422 if request validation fails.
    """
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
    """Update a roadmap item.

    Applies partial updates to a roadmap step.
    Returns 404 if the roadmap, item, or linked course is not found.
    Returns 422 if request validation fails.
    """
    return roadmap_service.update_roadmap_item(
        db, current_user.org_id, roadmap_id, item_id, body
    )


@router.delete(
    "/{roadmap_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_roadmap_item(
    roadmap_id: int,
    item_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """Delete a roadmap item.

    Removes a single step from a roadmap.
    Returns 404 if the roadmap or item is not found in the org.
    """
    roadmap_service.delete_roadmap_item(
        db, current_user.org_id, roadmap_id, item_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
