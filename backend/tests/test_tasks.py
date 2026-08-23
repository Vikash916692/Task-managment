import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_task_operations_and_comments(async_client: AsyncClient):
    # Setup PM
    pm_reg = await async_client.post("/api/v1/auth/register", json={
        "email": "task_pm@example.com",
        "full_name": "Task PM",
        "password": "Password@123",
        "role": "PROJECT_MANAGER"
    })
    pm_login = await async_client.post("/api/v1/auth/login", json={
        "email": "task_pm@example.com",
        "password": "Password@123"
    })
    pm_headers = {"Authorization": f"Bearer {pm_login.json()['access_token']}"}

    # Create project
    proj_res = await async_client.post("/api/v1/projects", json={
        "title": "Task System Testing Project",
        "status": "ACTIVE"
    }, headers=pm_headers)
    project_id = proj_res.json()["id"]

    # 1. Create a task
    task_res = await async_client.post("/api/v1/tasks", json={
        "project_id": project_id,
        "title": "Design Database Schema",
        "description": "Create SQLAlchemy models",
        "status": "TODO",
        "priority": "HIGH",
        "tags": ["DB", "SQLAlchemy"]
    }, headers=pm_headers)
    assert task_res.status_code == 201
    task_data = task_res.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Design Database Schema"
    assert task_data["status"] == "TODO"

    # 2. Move task on Kanban board (Drag & drop move)
    move_res = await async_client.patch(f"/api/v1/tasks/{task_id}/move", json={
        "status": "IN_PROGRESS",
        "position": 1
    }, headers=pm_headers)
    assert move_res.status_code == 200
    assert move_res.json()["status"] == "IN_PROGRESS"

    # 3. Add comment to task
    comment_res = await async_client.post(f"/api/v1/tasks/{task_id}/comments", json={
        "content": "Initial schema models have been defined."
    }, headers=pm_headers)
    assert comment_res.status_code == 201
    assert comment_res.json()["content"] == "Initial schema models have been defined."

    # 4. List comments
    comments_list = await async_client.get(f"/api/v1/tasks/{task_id}/comments", headers=pm_headers)
    assert comments_list.status_code == 200
    assert len(comments_list.json()) == 1

    # 5. List and filter tasks
    tasks_list_res = await async_client.get(f"/api/v1/tasks?project_id={project_id}&status=IN_PROGRESS", headers=pm_headers)
    assert tasks_list_res.status_code == 200
    assert tasks_list_res.json()["total"] == 1
