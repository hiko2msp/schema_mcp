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

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

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


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "Button Counter" in response.text


def test_increment_new_user(setup_database):
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 1


def test_increment_existing_user(setup_database):
    db = TestingSessionLocal()
    group = UserGroup(group_name="testgroup")
    user_click = UserClick(user_id="testuser", click_count=5, group=group)
    db.add(user_click)
    db.commit()
    db.close()
    
    response = client.post("/api/click/testuser", json={"group_name": "testgroup"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 6


def test_get_clicks_for_existing_user(setup_database):
    db = TestingSessionLocal()
    group = UserGroup(group_name="testgroup")
    user_click = UserClick(user_id="testuser", click_count=3, group=group)
    db.add(user_click)
    db.commit()
    db.close()
    
    response = client.get("/api/clicks/testuser")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "testuser"
    assert data["click_count"] == 3


def test_get_clicks_for_nonexistent_user(setup_database):
    response = client.get("/api/clicks/nonexistent")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_multiple_clicks(setup_database):
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
