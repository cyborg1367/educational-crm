from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.schemas import TokenResponse
from app.auth.security import create_access_token, verify_password
from app.core.errors import AuthenticationError
from app.user.model import User


def login(db: Session, *, email: str, password: str) -> TokenResponse:
    user = db.scalars(select(User).where(User.email == email)).first()
    if user is None or not verify_password(password, user.password_hash):
        raise AuthenticationError("Incorrect email or password")
    if not user.is_active:
        raise AuthenticationError("Inactive user")

    token = create_access_token(user_id=user.id, org_id=user.org_id)
    return TokenResponse(access_token=token)
