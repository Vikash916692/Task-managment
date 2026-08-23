import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(async_client: AsyncClient):
    # 1. Register a new user
    register_payload = {
        "email": "tester@example.com",
        "full_name": "Test Engineer",
        "password": "Password@123",
        "role": "MEMBER"
    }
    reg_response = await async_client.post("/api/v1/auth/register", json=register_payload)
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["email"] == "tester@example.com"
    assert user_data["full_name"] == "Test Engineer"
    assert "hashed_password" not in user_data

    # 2. Login with correct credentials
    login_payload = {
        "email": "tester@example.com",
        "password": "Password@123"
    }
    login_response = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    assert token_data["token_type"] == "bearer"

    # 3. Access protected /auth/me route
    access_token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "tester@example.com"

    # 4. Refresh token
    refresh_payload = {"refresh_token": token_data["refresh_token"]}
    refresh_response = await async_client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert refresh_response.status_code == 200
    new_token_data = refresh_response.json()
    assert "access_token" in new_token_data

    # 5. Login with invalid password
    invalid_login = {
        "email": "tester@example.com",
        "password": "WrongPassword!"
    }
    bad_login_res = await async_client.post("/api/v1/auth/login", json=invalid_login)
    assert bad_login_res.status_code == 401
