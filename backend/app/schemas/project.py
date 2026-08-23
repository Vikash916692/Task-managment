from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.project import ProjectRole, ProjectStatus
from app.schemas.user import UserSummary


class ProjectMemberBase(BaseModel):
    user_id: int
    role: ProjectRole = ProjectRole.CONTRIBUTOR


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberUpdate(BaseModel):
    role: ProjectRole


class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: ProjectRole
    joined_at: datetime
    user: UserSummary

    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    owner: UserSummary
    members_count: Optional[int] = 0
    tasks_count: Optional[int] = 0
    completed_tasks_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectResponse):
    members: List[ProjectMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)
