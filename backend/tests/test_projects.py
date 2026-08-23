import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_project_crud_and_rbac(async_client: AsyncClient):
    # 1. Create PM user
    pm_reg = await async_client.post("/api/v1/auth/register", json={
        "email": "pm_tester@example.com",
        "full_name": "PM Tester",
        "password": "Password@123",
        "role": "PROJECT_MANAGER"
    })
    assert pm_reg.status_code == 201
    pm_login = await async_client.post("/api/v1/auth/login", json={
        "email": "pm_tester@example.com",
        "password": "Password@123"
    })
    pm_token = pm_login.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}

    # 2. Create Member user
    member_reg = await async_client.post("/api/v1/auth/register", json={
        "email": "dev_tester@example.com",
        "full_name": "Dev Tester",
        "password": "Password@123",
        "role": "MEMBER"
    })
    member_id = member_reg.json()["id"]
    member_login = await async_client.post("/api/v1/auth/login", json={
        "email": "dev_tester@example.com",
        "password": "Password@123"
    })
    member_token = member_login.json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # 3. Member cannot create project (RBAC check)
    member_proj_res = await async_client.post("/api/v1/projects", json={
        "title": "Unauthorized Member Project"
    }, headers=member_headers)
    assert member_proj_res.status_code == 403

    # 4. PM creates project
    proj_res = await async_client.post("/api/v1/projects", json={
        "title": "Backend Microservice Redesign",
        "description": "Migration to FastAPI",
        "status": "ACTIVE"
    }, headers=pm_headers)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    assert proj_res.json()["title"] == "Backend Microservice Redesign"

    # 5. PM adds Dev as project member
    add_mem_res = await async_client.post(f"/api/v1/projects/{project_id}/members", json={
        "user_id": member_id,
        "role": "CONTRIBUTOR"
    }, headers=pm_headers)
    assert add_mem_res.status_code == 201

    # 6. Dev can now view project
    dev_view_res = await async_client.get(f"/api/v1/projects/{project_id}", headers=member_headers)
    assert dev_view_res.status_code == 200
    assert len(dev_view_res.json()["members"]) == 2
