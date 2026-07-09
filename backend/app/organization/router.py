from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.deps import get_current_org, get_current_user
from app.core.openapi import PROTECTED_RESPONSES
from app.organization.model import Organization
from app.user.model import User
from app.user.schemas import OrganizationRead

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("/me", response_model=OrganizationRead)
def get_current_organization(
    current_org: Annotated[Organization, Depends(get_current_org)],
) -> Organization:
    """Get the authenticated user's organization.

    Returns the organization record tied to the bearer token's org_id.
    """
    return current_org


@router.get("/{organization_id}", response_model=OrganizationRead)
def get_organization(
    organization_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    current_org: Annotated[Organization, Depends(get_current_org)],
) -> Organization:
    """Get an organization by ID.

    Returns the organization only when it matches the authenticated user's org.
    Returns 404 if the ID does not match the caller's organization.
    """
    if organization_id != current_user.org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return current_org
