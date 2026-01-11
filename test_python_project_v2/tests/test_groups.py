from fastapi.testclient import TestClient
from app.models import UserGroup

# Fixtures `client` and `db_session` are provided by conftest.py


def test_increment_new_user_with_group(client: TestClient):
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 1
    assert data["group_name"] == "testgroup"
    assert data["group_total_click_count"] == 1


def test_increment_existing_user_with_existing_group(client: TestClient):
    client.post("/api/click/testuser", json={"group_name": "testgroup"})
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 2
    assert data["group_name"] == "testgroup"
    assert data["group_total_click_count"] == 2


def test_increment_existing_user_with_new_group(client: TestClient, db_session):
    client.post("/api/click/testuser", json={"group_name": "testgroup1"})
    response = client.post("/api/click/testuser", json={"group_name": "testgroup2"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 2
    assert data["group_name"] == "testgroup2"
    assert data["group_total_click_count"] == 1

    group1 = db_session.query(UserGroup).filter(UserGroup.group_name == "testgroup1").first()
    assert group1.total_click_count == 1


def test_get_clicks_for_user_with_group(client: TestClient):
    client.post("/api/click/testuser", json={"group_name": "testgroup"})
    response = client.get("/api/clicks/testuser")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 1
    assert data["group_name"] == "testgroup"
    assert data["group_total_click_count"] == 1


def test_get_clicks_for_group(client: TestClient):
    client.post("/api/click/user1", json={"group_name": "testgroup"})
    client.post("/api/click/user2", json={"group_name": "testgroup"})
    response = client.get("/api/clicks/group/testgroup")
    assert response.status_code == 200
    data = response.json()
    assert data["group_name"] == "testgroup"
    assert data["total_click_count"] == 2


def test_get_clicks_for_nonexistent_group(client: TestClient):
    response = client.get("/api/clicks/group/nonexistent")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_or_create_user(client: TestClient):
    # Test creating a new user and group
    response = client.post("/api/user", json={"user_id": "newuser", "group_name": "newgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "newuser"
    assert data["click_count"] == 0
    assert data["group_name"] == "newgroup"
    assert data["group_total_click_count"] == 0

    # Test retrieving an existing user
    client.post("/api/click/newuser", json={"group_name": "newgroup"})
    response = client.post("/api/user", json={"user_id": "newuser", "group_name": "newgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "newuser"
    assert data["click_count"] == 1
    assert data["group_name"] == "newgroup"
    assert data["group_total_click_count"] == 1
