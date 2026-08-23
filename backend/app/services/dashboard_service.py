from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.redis import redis_service
from app.models.activity import ActivityLog
from app.models.project import Project, ProjectMember, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User, UserRole


async def get_dashboard_stats(
    db: AsyncSession,
    current_user: User
) -> Dict[str, Any]:
    cache_key = f"dashboard:stats:{current_user.id}:{current_user.role.value}"
    cached = await redis_service.get(cache_key)
    if cached:
        return cached

    # Subqueries for user's accessible projects
    if current_user.role == UserRole.ADMIN:
        accessible_project_ids = select(Project.id)
    else:
        member_proj = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
        owned_proj = select(Project.id).where(Project.owner_id == current_user.id)
        accessible_project_ids = select(Project.id).where(
            (Project.id.in_(member_proj)) | (Project.id.in_(owned_proj))
        )

    # 1. Project counts
    total_proj_res = await db.execute(
        select(func.count(Project.id)).where(Project.id.in_(accessible_project_ids))
    )
    total_projects = total_proj_res.scalar() or 0

    active_proj_res = await db.execute(
        select(func.count(Project.id)).where(
            Project.id.in_(accessible_project_ids),
            Project.status == ProjectStatus.ACTIVE
        )
    )
    active_projects = active_proj_res.scalar() or 0

    # 2. Task metrics
    task_scope = Task.project_id.in_(accessible_project_ids)
    
    total_tasks_res = await db.execute(select(func.count(Task.id)).where(task_scope))
    total_tasks = total_tasks_res.scalar() or 0

    completed_tasks_res = await db.execute(
        select(func.count(Task.id)).where(task_scope, Task.status == TaskStatus.COMPLETED)
    )
    completed_tasks = completed_tasks_res.scalar() or 0

    in_progress_res = await db.execute(
        select(func.count(Task.id)).where(task_scope, Task.status == TaskStatus.IN_PROGRESS)
    )
    in_progress_tasks = in_progress_res.scalar() or 0

    todo_res = await db.execute(
        select(func.count(Task.id)).where(task_scope, Task.status == TaskStatus.TODO)
    )
    todo_tasks = todo_res.scalar() or 0

    review_res = await db.execute(
        select(func.count(Task.id)).where(task_scope, Task.status == TaskStatus.REVIEW)
    )
    review_tasks = review_res.scalar() or 0

    today = date.today()
    overdue_res = await db.execute(
        select(func.count(Task.id)).where(
            task_scope,
            Task.status != TaskStatus.COMPLETED,
            Task.due_date != None,
            Task.due_date < today
        )
    )
    overdue_tasks = overdue_res.scalar() or 0

    # Priority counts
    priority_counts = {}
    for p in TaskPriority:
        p_res = await db.execute(
            select(func.count(Task.id)).where(task_scope, Task.priority == p)
        )
        priority_counts[p.value] = p_res.scalar() or 0

    # Completion rate
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    # 3. Recent activities
    activities_query = (
        select(ActivityLog)
        .options(selectinload(ActivityLog.user))
        .where(ActivityLog.project_id.in_(accessible_project_ids))
        .order_by(desc(ActivityLog.created_at))
        .limit(10)
    )
    act_res = await db.execute(activities_query)
    activities = act_res.scalars().all()
    recent_activities = [
        {
            "id": a.id,
            "project_id": a.project_id,
            "task_id": a.task_id,
            "user_id": a.user_id,
            "user_name": a.user.full_name if a.user else "System",
            "action": a.action,
            "details": a.details,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in activities
    ]

    # 4. Upcoming Deadlines (within next 7 days, uncompleted)
    next_week = today + timedelta(days=7)
    upcoming_query = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.project),
            selectinload(Task.comments)
        )
        .where(
            task_scope,
            Task.status != TaskStatus.COMPLETED,
            Task.due_date != None,
            Task.due_date >= today,
            Task.due_date <= next_week
        )
        .order_by(Task.due_date.asc())
        .limit(6)
    )
    up_res = await db.execute(upcoming_query)
    upcoming_tasks = up_res.scalars().all()
    upcoming_deadlines = [
        {
            "id": t.id,
            "project_id": t.project_id,
            "project_title": t.project.title if t.project else "",
            "title": t.title,
            "description": t.description,
            "status": t.status.value,
            "priority": t.priority.value,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "position": t.position,
            "tags": t.tags or [],
            "creator_id": t.creator_id,
            "assignee_id": t.assignee_id,
            "creator": {
                "id": t.creator.id,
                "email": t.creator.email,
                "full_name": t.creator.full_name,
                "role": t.creator.role.value,
                "avatar_url": t.creator.avatar_url
            } if t.creator else None,
            "assignee": {
                "id": t.assignee.id,
                "email": t.assignee.email,
                "full_name": t.assignee.full_name,
                "role": t.assignee.role.value,
                "avatar_url": t.assignee.avatar_url
            } if t.assignee else None,
            "comments_count": len(t.comments),
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
        }
        for t in upcoming_tasks
    ]

    # 5. Team Workloads
    users_query = select(User).where(User.is_active == True).limit(10)
    users_res = await db.execute(users_query)
    active_users = users_res.scalars().all()

    team_workloads = []
    for u in active_users:
        u_tot_res = await db.execute(select(func.count(Task.id)).where(Task.assignee_id == u.id, task_scope))
        u_comp_res = await db.execute(select(func.count(Task.id)).where(Task.assignee_id == u.id, Task.status == TaskStatus.COMPLETED, task_scope))
        u_tot = u_tot_res.scalar() or 0
        u_comp = u_comp_res.scalar() or 0
        if u_tot > 0 or u.role in [UserRole.PROJECT_MANAGER, UserRole.ADMIN]:
            team_workloads.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
                "total_tasks": u_tot,
                "completed_tasks": u_comp,
                "pending_tasks": u_tot - u_comp
            })

    data = {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "pending_tasks": todo_tasks + review_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate_percentage": completion_rate,
        "status_distribution": {
            "TODO": todo_tasks,
            "IN_PROGRESS": in_progress_tasks,
            "REVIEW": review_tasks,
            "COMPLETED": completed_tasks
        },
        "priority_distribution": priority_counts,
        "recent_activities": recent_activities,
        "upcoming_deadlines": upcoming_deadlines,
        "team_workloads": team_workloads
    }

    await redis_service.set(cache_key, data, expire_seconds=120)
    return data
