from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.task import TaskPriority, TaskStatus
from app.schemas.user import UserSummary


class TaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[date] = None
    tags: Optional[List[str]] = []
    assignee_id: Optional[int] = None


class TaskCreate(TaskBase):
    project_id: int
    position: Optional[int] = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None
    tags: Optional[List[str]] = None
    assignee_id: Optional[int] = None
    position: Optional[int] = None


class TaskMoveRequest(BaseModel):
    status: TaskStatus
    position: int


class TaskResponse(TaskBase):
    id: int
    project_id: int
    creator_id: int
    position: int
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserSummary] = None
    assignee: Optional[UserSummary] = None
    project_title: Optional[str] = None
    comments_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class TaskFilterParams(BaseModel):
    project_id: Optional[int] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[int] = None
    search: Optional[str] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    tag: Optional[str] = None
    sort_by: Optional[str] = "position"
    sort_order: Optional[str] = "asc"
    page: int = 1
    page_size: int = 50
