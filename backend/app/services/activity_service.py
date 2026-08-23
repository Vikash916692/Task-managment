from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.activity import ActivityLog


async def log_activity(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    action: str,
    details: Optional[str] = None,
    task_id: Optional[int] = None
) -> ActivityLog:
    """Create an activity audit entry for a project or task event."""
    activity = ActivityLog(
        project_id=project_id,
        user_id=user_id,
        action=action,
        details=details,
        task_id=task_id
    )
    db.add(activity)
    # Flushed as part of transaction
    return activity
