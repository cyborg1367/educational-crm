"""Tests for the per-user signature image upload/delete endpoints."""

import io

import pytest
from sqlalchemy.orm import Session

from app.auth.security import create_access_token, hash_password
from app.core.config import settings
from app.user.enums import UserRole
from app.user.model import User

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(autouse=True)
def _isolated_upload_dir(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))


@pytest.fixture
def teacher_user(db_session: Session, org_id: int) -> User:
    record = User(
        name="A Teacher",
        email="signature-teacher@test.example",
        password_hash=hash_password("test-password"),
        role=UserRole.teacher,
        org_id=org_id,
        is_active=True,
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


def test_admin_can_upload_and_delete_signature(
    api_client, teacher_user: User
) -> None:
    response = api_client.post(
        f"/users/{teacher_user.id}/signature",
        files={"file": ("signature.png", io.BytesIO(PNG_BYTES), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["signature_url"].startswith("/uploads/signatures/")

    delete_response = api_client.delete(f"/users/{teacher_user.id}/signature")
    assert delete_response.status_code == 200
    assert delete_response.json()["signature_url"] is None


def test_upload_rejects_non_image_content_type(
    api_client, teacher_user: User
) -> None:
    response = api_client.post(
        f"/users/{teacher_user.id}/signature",
        files={"file": ("signature.txt", io.BytesIO(b"not an image"), "text/plain")},
    )

    assert response.status_code == 422


def test_upload_rejects_oversized_file(api_client, teacher_user: User) -> None:
    oversized = b"\x00" * (2 * 1024 * 1024 + 1)
    response = api_client.post(
        f"/users/{teacher_user.id}/signature",
        files={"file": ("signature.png", io.BytesIO(oversized), "image/png")},
    )

    assert response.status_code == 422


def test_teacher_cannot_upload_signature(teacher_user: User, api_client) -> None:
    token = create_access_token(user_id=teacher_user.id, org_id=teacher_user.org_id)
    api_client.headers.update({"Authorization": f"Bearer {token}"})

    response = api_client.post(
        f"/users/{teacher_user.id}/signature",
        files={"file": ("signature.png", io.BytesIO(PNG_BYTES), "image/png")},
    )

    assert response.status_code == 403


def test_uploading_new_signature_replaces_old_file(
    api_client, teacher_user: User
) -> None:
    first = api_client.post(
        f"/users/{teacher_user.id}/signature",
        files={"file": ("first.png", io.BytesIO(PNG_BYTES), "image/png")},
    )
    first_url = first.json()["signature_url"]
    first_path = settings.UPLOAD_DIR + first_url.removeprefix("/uploads")

    second = api_client.post(
        f"/users/{teacher_user.id}/signature",
        files={"file": ("second.png", io.BytesIO(PNG_BYTES), "image/png")},
    )
    second_url = second.json()["signature_url"]

    assert second_url != first_url

    import os

    assert not os.path.exists(first_path)
