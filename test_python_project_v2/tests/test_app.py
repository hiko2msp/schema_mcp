from fastapi.testclient import TestClient
from app.models import UserClick, UserGroup

# The `client` fixture is now provided by `conftest.py`
# The `setup_database` fixture is also provided by `conftest.py`


def test_read_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Button Counter" in response.text


def test_increment_new_user(client: TestClient):
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 1


def test_increment_existing_user(client: TestClient, db_session):
    group = UserGroup(group_name="testgroup")
    user_click = UserClick(user_id="testuser", click_count=5, group=group)
    db_session.add(user_click)
    db_session.commit()
    
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 6


def test_get_clicks_for_existing_user(client: TestClient, db_session):
    group = UserGroup(group_name="testgroup")
    user_click = UserClick(user_id="testuser", click_count=3, group=group)
    db_session.add(user_click)
    db_session.commit()
    
    response = client.get("/api/clicks/testuser")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 3


def test_get_clicks_for_nonexistent_user(client: TestClient):
    response = client.get("/api/clicks/nonexistent")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_multiple_clicks(client: TestClient):
    user_id = "multiclick_user"
    
    for i in range(5):
        response = client.post(f"/api/click/{user_id}", json={"group_name": "testgroup"})
        assert response.status_code == 200
        data = response.json()
        assert data["click_count"] == i + 1
    
    response = client.get(f"/api/clicks/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["click_count"] == 5
