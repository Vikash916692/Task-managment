from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db, require_manager_or_admin
from app.models.project import ProjectRole, ProjectStatus
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectDetailResponse, ProjectMemberCreate, ProjectMemberResponse, ProjectResponse, ProjectUpdate
from app.services.project_service import add_project_member, create_project, delete_project, get_project_details, get_projects, remove_project_member, update_project

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[ProjectStatus] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List accessible projects for the current user."""
    return await get_projects(db, current_user, status=status, search=search)


@router.post("", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project (Admin or Project Manager)."""
    return await create_project(db, project_in, current_user)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get project details with members."""
    return await get_project_details(db, project_id, current_user)


@router.put("/{project_id}", response_model=ProjectDetailResponse)
async def update_existing_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update project title, description, status, or timelines."""
    return await update_project(db, project_id, project_in, current_user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project (Owner or Admin)."""
    await delete_project(db, project_id, current_user)


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    project_id: int,
    member_in: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a user as a project member."""
    return await add_project_member(db, project_id, member_in, current_user)


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a user from project members."""
    await remove_project_member(db, project_id, user_id, current_user)
