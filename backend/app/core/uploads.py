"""Local filesystem storage for user-uploaded files (e.g. signature scans)."""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.errors import ValidationError

MAX_UPLOAD_SIZE = 2 * 1024 * 1024  # 2 MB

ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}

SIGNATURES_SUBDIR = "signatures"


def _upload_root() -> Path:
    return Path(settings.UPLOAD_DIR)


def save_signature_image(user_id: int, file: UploadFile) -> str:
    """Validate and persist a signature image, returning its public URL path."""
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise ValidationError(
            "Signature must be a PNG, JPEG, or WEBP image.", field="file"
        )

    contents = file.file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise ValidationError("Signature image must be 2MB or smaller.", field="file")

    subdir = _upload_root() / SIGNATURES_SUBDIR
    subdir.mkdir(parents=True, exist_ok=True)

    filename = f"user-{user_id}-{uuid.uuid4().hex}{extension}"
    (subdir / filename).write_bytes(contents)

    return f"/uploads/{SIGNATURES_SUBDIR}/{filename}"


def delete_signature_image(signature_url: str) -> None:
    """Remove a previously saved signature image, if it exists on disk."""
    prefix = "/uploads/"
    if not signature_url.startswith(prefix):
        return

    path = _upload_root() / signature_url.removeprefix(prefix)
    path.unlink(missing_ok=True)
