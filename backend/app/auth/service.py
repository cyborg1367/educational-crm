from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.schemas import TokenResponse
from app.auth.security import create_access_token, verify_password
from app.core.errors import AuthenticationError
from app.core.logging_config import get_logger
from app.user.model import User

logger = get_logger(__name__)


def login(db: Session, *, email: str, password: str) -> TokenResponse:
    user = db.scalars(select(User).where(User.email == email)).first()
    if user is None or not verify_password(password, user.password_hash):
        logger.info(
            "login_failed",
            extra={"event": "login", "success": False},
        )
        raise AuthenticationError("Incorrect email or password")
    if not user.is_active:
        logger.info(
            "login_failed",
            extra={"event": "login", "success": False, "user_id": user.id},
        )
        raise AuthenticationError("Inactive user")

    logger.info(
        "login_success",
        extra={"event": "login", "success": True, "user_id": user.id},
    )
    token = create_access_token(user_id=user.id, org_id=user.org_id)
    return TokenResponse(access_token=token)
