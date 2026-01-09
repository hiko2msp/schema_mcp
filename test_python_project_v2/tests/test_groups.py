import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_db
from app.models import UserClick, UserGroup, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_groups.db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(scope="function")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_increment_new_user_with_group(setup_database):
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 1
    assert data["group_name"] == "testgroup"
    assert data["group_total_click_count"] == 1


def test_increment_existing_user_with_existing_group(setup_database):
    client.post("/api/click/testuser", json={"group_name": "testgroup"})
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 2
    assert data["group_name"] == "testgroup"
    assert data["group_total_click_count"] == 2


def test_increment_existing_user_with_new_group(setup_database):
    client.post("/api/click/testuser", json={"group_name": "testgroup1"})
    response = client.post("/api/click/testuser", json={"group_name": "testgroup2"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 2
    assert data["group_name"] == "testgroup2"
    assert data["group_total_click_count"] == 1

    db = TestingSessionLocal()
    group1 = db.query(UserGroup).filter(UserGroup.group_name == "testgroup1").first()
    assert group1.total_click_count == 1
    db.close()


def test_get_clicks_for_user_with_group(setup_database):
    client.post("/api/click/testuser", json={"group_name": "testgroup"})
    response = client.get("/api/clicks/testuser")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 1
    assert data["group_name"] == "testgroup"
    assert data["group_total_click_count"] == 1


def test_get_clicks_for_group(setup_database):
    client.post("/api/click/user1", json={"group_name": "testgroup"})
    client.post("/api/click/user2", json={"group_name": "testgroup"})
    response = client.get("/api/clicks/group/testgroup")
    assert response.status_code == 200
    data = response.json()
    assert data["group_name"] == "testgroup"
    assert data["total_click_count"] == 2


def test_get_clicks_for_nonexistent_group(setup_database):
    response = client.get("/api/clicks/group/nonexistent")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
