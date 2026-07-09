"""Pagination tests for list endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.person import service as person_service
from app.person.schemas import PersonCreate


def _seed_people(db_session: Session, org_id: int, count: int) -> None:
    for i in range(count):
        person_service.create_person(
            db_session,
            org_id,
            PersonCreate(
                full_name=f"Person {i:02d}",
                phone=f"0912{i:07d}",
            ),
        )


def test_pagination_defaults(
    api_client: TestClient,
    db_session: Session,
    org_id: int,
) -> None:
    _seed_people(db_session, org_id, 3)

    response = api_client.get("/people")

    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 50
    assert data["offset"] == 0
    assert data["total_count"] == 3
    assert len(data["items"]) == 3
    assert data["has_more"] is False


def test_pagination_custom(
    api_client: TestClient,
    db_session: Session,
    org_id: int,
) -> None:
    _seed_people(db_session, org_id, 30)

    response = api_client.get("/people", params={"limit": 10, "offset": 20})

    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 10
    assert data["offset"] == 20
    assert data["total_count"] == 30
    assert len(data["items"]) == 10
    assert [item["full_name"] for item in data["items"]] == [
        f"Person {i:02d}" for i in range(20, 30)
    ]


def test_pagination_has_more(
    api_client: TestClient,
    db_session: Session,
    org_id: int,
) -> None:
    _seed_people(db_session, org_id, 20)

    response = api_client.get("/people", params={"limit": 10, "offset": 0})

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 20
    assert len(data["items"]) == 10
    assert data["has_more"] is True


def test_pagination_last_page(
    api_client: TestClient,
    db_session: Session,
    org_id: int,
) -> None:
    _seed_people(db_session, org_id, 20)

    response = api_client.get("/people", params={"limit": 10, "offset": 15})

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 20
    assert len(data["items"]) == 5
    assert data["has_more"] is False


def test_pagination_max_limit(
    api_client: TestClient,
    db_session: Session,
    org_id: int,
) -> None:
    _seed_people(db_session, org_id, 5)

    response = api_client.get("/people", params={"limit": 1000})

    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 500
