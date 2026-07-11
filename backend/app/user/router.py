from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, require_role
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user import service as user_service
from app.user.enums import UserRole
from app.user.model import User
from app.user.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[UserRead])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[UserRead]:
    """List users.

    Returns a paginated list of staff users in the organization. Admin role required.
    Returns 403 if the caller is not an admin.
    """
    items, total_count = user_service.list_users(
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


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    """Get a user by ID.

    Fetches a single staff user record. Admin role required.
    Returns 404 if the user is not found in the org.
    Returns 403 if the caller is not an admin.
    """
    return user_service.get_user(db, current_user.org_id, user_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    """Create a new user.

    Registers a staff account in the organization. Admin role required.
    Returns 409 if the email is already registered in the org.
    Returns 403 if the caller is not an admin.
    Returns 422 if request validation fails.
    """
    return user_service.create_user(db, current_user.org_id, body)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    """Update a user.

    Applies partial updates to a staff account. Admin role required.
    Returns 404 if the user is not found.
    Returns 409 if the new email is already registered in the org.
    Returns 403 if the caller is not an admin.
    Returns 422 if request validation fails.
    """
    return user_service.update_user(db, current_user.org_id, user_id, body)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> None:
    """Deactivate a user.

    Soft-deletes a staff account by marking it inactive. Admin role required.
    Returns 404 if the user is not found in the org.
    Returns 403 if the caller is not an admin.
    """
    user_service.delete_user(db, current_user.org_id, user_id)


@router.post("/{user_id}/signature", response_model=UserRead)
def upload_user_signature(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
    file: Annotated[
        UploadFile, File(description="Signature image (PNG/JPEG/WEBP, max 2MB).")
    ],
) -> User:
    """Upload a signature image for a user.

    Stores a scanned signature for use on generated certificates, replacing
    any previously uploaded signature. Admin role required.
    Returns 404 if the user is not found in the org.
    Returns 403 if the caller is not an admin.
    Returns 422 if the file is not a supported image type or exceeds 2MB.
    """
    return user_service.upload_signature(db, current_user.org_id, user_id, file)


@router.delete("/{user_id}/signature", response_model=UserRead)
def delete_user_signature(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.admin))],
) -> User:
    """Remove a user's uploaded signature image.

    Admin role required.
    Returns 404 if the user is not found in the org.
    Returns 403 if the caller is not an admin.
    """
    return user_service.remove_signature(db, current_user.org_id, user_id)
