"""Auth profile and organization read endpoints."""

from fastapi.testclient import TestClient

from app.user.model import User


def test_get_auth_me(api_client: TestClient, admin_user: User) -> None:
    response = api_client.get("/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == admin_user.id
    assert body["email"] == admin_user.email
    assert body["name"] == admin_user.name
    assert body["role"] == admin_user.role.value
    assert body["org_id"] == admin_user.org_id
    assert "password_hash" not in body
    assert "password" not in body


def test_get_auth_me_requires_auth(db_session) -> None:
    from app.core.db import get_db
    from app.main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            response = client.get("/auth/me")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_get_organization_me(api_client: TestClient, org_id: int) -> None:
    response = api_client.get("/organizations/me")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == org_id
    assert body["name"] == "Test Org"
    assert body["is_active"] is True


def test_get_organization_by_id(api_client: TestClient, org_id: int) -> None:
    response = api_client.get(f"/organizations/{org_id}")
    assert response.status_code == 200
    assert response.json()["id"] == org_id


def test_get_organization_by_id_wrong_org_returns_404(
    api_client: TestClient,
) -> None:
    response = api_client.get("/organizations/999")
    assert response.status_code == 404
