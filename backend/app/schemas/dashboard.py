from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.project import ProjectResponse
from app.schemas.task import TaskResponse


class ActivityLogResponse(BaseModel):
    id: int
    project_id: int
    task_id: Optional[int] = None
    user_id: int
    action: str
    details: Optional[str] = None
    created_at: str
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PriorityDistribution(BaseModel):
    LOW: int = 0
    MEDIUM: int = 0
    HIGH: int = 0
    URGENT: int = 0


class StatusDistribution(BaseModel):
    TODO: int = 0
    IN_PROGRESS: int = 0
    REVIEW: int = 0
    COMPLETED: int = 0


class UserWorkload(BaseModel):
    user_id: int
    full_name: str
    avatar_url: Optional[str] = None
    total_tasks: int
    completed_tasks: int
    pending_tasks: int


class DashboardStatsResponse(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate_percentage: float
    status_distribution: StatusDistribution
    priority_distribution: PriorityDistribution
    recent_activities: List[Dict[str, Any]] = []
    upcoming_deadlines: List[TaskResponse] = []
    team_workloads: List[UserWorkload] = []
