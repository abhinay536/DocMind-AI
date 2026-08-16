import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_user_registration_and_login():
    email = "testuser@example.com"
    password = "SecretPassword123"

    # Register
    reg_response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"}
    )
    assert reg_response.status_code in [201, 400]

    # Login
    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
