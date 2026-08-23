from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import asc, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.redis import redis_service
from app.models.comment import Comment
from app.models.notification import NotificationType
from app.models.project import Project, ProjectMember, ProjectRole
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User, UserRole
from app.schemas.task import TaskCreate, TaskFilterParams, TaskMoveRequest, TaskResponse, TaskUpdate
from app.services.activity_service import log_activity
from app.services.notification_service import create_notification
from app.services.project_service import check_user_project_access


async def get_task_by_id(
    db: AsyncSession,
    task_id: int,
    current_user: User
) -> Task:
    result = await db.execute(
        select(Task)
        .options(
            selectinload(Task.creator),
            selectinload(Task.assignee),
            selectinload(Task.project),
            selectinload(Task.comments).selectinload(Comment.author)
        )
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundException(f"Task with ID {task_id} not found")

    # Verify project access
    await check_user_project_access(db, task.project_id, current_user)
    return task


async def get_tasks(
    db: AsyncSession,
    current_user: User,
    filters: TaskFilterParams
) -> Tuple[List[dict], int]:
    # Query builder
    query = select(Task).options(
        selectinload(Task.creator),
        selectinload(Task.assignee),
        selectinload(Task.project),
        selectinload(Task.comments)
    )

    # Restrict by project membership if not admin and no specific project requested
    if current_user.role != UserRole.ADMIN:
        member_project_subquery = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
        owner_project_subquery = select(Project.id).where(Project.owner_id == current_user.id)
        query = query.where(
            (Task.project_id.in_(member_project_subquery)) | (Task.project_id.in_(owner_project_subquery))
        )

    if filters.project_id:
        # Check project access first
        await check_user_project_access(db, filters.project_id, current_user)
        query = query.where(Task.project_id == filters.project_id)

    if filters.status:
        query = query.where(Task.status == filters.status)
    if filters.priority:
        query = query.where(Task.priority == filters.priority)
    if filters.assignee_id:
        query = query.where(Task.assignee_id == filters.assignee_id)
    if filters.search:
        term = f"%{filters.search}%"
        query = query.where(
            or_(
                Task.title.ilike(term),
                Task.description.ilike(term)
            )
        )
    if filters.due_date_from:
        query = query.where(Task.due_date >= filters.due_date_from)
    if filters.due_date_to:
        query = query.where(Task.due_date <= filters.due_date_to)

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar() or 0

    # Sorting
    if filters.sort_by == "priority":
        sort_col = Task.priority
    elif filters.sort_by == "due_date":
        sort_col = Task.due_date
    elif filters.sort_by == "created_at":
        sort_col = Task.created_at
    else:
        sort_col = Task.position

    if filters.sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))

    # Pagination
    offset = (filters.page - 1) * filters.page_size
    query = query.offset(offset).limit(filters.page_size)

    result = await db.execute(query)
    tasks = result.scalars().all()

    # Filter by tag in memory if specified
    if filters.tag:
        tasks = [t for t in tasks if t.tags and filters.tag.lower() in [tag.lower() for tag in t.tags]]

    response = []
    for t in tasks:
        response.append({
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
        })

    return response, total_count


async def create_task(
    db: AsyncSession,
    task_in: TaskCreate,
    current_user: User
) -> Task:
    # Verify access to project
    project = await check_user_project_access(db, task_in.project_id, current_user)

    # Calculate next position in column
    pos_res = await db.execute(
        select(func.coalesce(func.max(Task.position), 0))
        .where(Task.project_id == task_in.project_id, Task.status == task_in.status)
    )
    max_pos = pos_res.scalar() or 0

    task = Task(
        project_id=task_in.project_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        due_date=task_in.due_date,
        position=max_pos + 1,
        tags=task_in.tags or [],
        creator_id=current_user.id,
        assignee_id=task_in.assignee_id
    )
    db.add(task)
    await db.flush()

    await log_activity(
        db,
        project_id=task.project_id,
        task_id=task.id,
        user_id=current_user.id,
        action="TASK_CREATED",
        details=f"Created task '{task.title}'"
    )

    # Notify assignee if assigned to someone else
    if task.assignee_id and task.assignee_id != current_user.id:
        await create_notification(
            db,
            user_id=task.assignee_id,
            task_id=task.id,
            title="New Task Assigned",
            message=f"{current_user.full_name} assigned you to '{task.title}' in {project.title}",
            notification_type=NotificationType.TASK_ASSIGNED
        )

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")

    return await get_task_by_id(db, task.id, current_user)


async def update_task(
    db: AsyncSession,
    task_id: int,
    task_in: TaskUpdate,
    current_user: User
) -> Task:
    task = await get_task_by_id(db, task_id, current_user)
    prev_assignee_id = task.assignee_id
    prev_status = task.status

    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.status is not None:
        task.status = task_in.status
    if task_in.priority is not None:
        task.priority = task_in.priority
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.tags is not None:
        task.tags = task_in.tags
    if task_in.assignee_id is not None:
        task.assignee_id = task_in.assignee_id if task_in.assignee_id != 0 else None
    if task_in.position is not None:
        task.position = task_in.position

    await db.flush()

    # Log status transition
    if task_in.status is not None and task_in.status != prev_status:
        await log_activity(
            db,
            project_id=task.project_id,
            task_id=task.id,
            user_id=current_user.id,
            action="TASK_STATUS_CHANGED",
            details=f"Status changed from {prev_status.value} to {task.status.value}"
        )
        if task.assignee_id and task.assignee_id != current_user.id:
            await create_notification(
                db,
                user_id=task.assignee_id,
                task_id=task.id,
                title="Task Status Updated",
                message=f"'{task.title}' moved to {task.status.value} by {current_user.full_name}",
                notification_type=NotificationType.STATUS_CHANGED
            )

    # Notify new assignee
    if task_in.assignee_id is not None and task.assignee_id and task.assignee_id != prev_assignee_id and task.assignee_id != current_user.id:
        await create_notification(
            db,
            user_id=task.assignee_id,
            task_id=task.id,
            title="Task Assigned To You",
            message=f"{current_user.full_name} assigned you to '{task.title}'",
            notification_type=NotificationType.TASK_ASSIGNED
        )

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")
    return await get_task_by_id(db, task.id, current_user)


async def move_task(
    db: AsyncSession,
    task_id: int,
    move_in: TaskMoveRequest,
    current_user: User
) -> Task:
    """Optimized drag-and-drop column status and position reordering."""
    task = await get_task_by_id(db, task_id, current_user)
    prev_status = task.status
    prev_pos = task.position

    task.status = move_in.status
    task.position = move_in.position

    # Shift sibling positions in destination column
    await db.execute(
        update(Task)
        .where(
            Task.project_id == task.project_id,
            Task.status == move_in.status,
            Task.id != task.id,
            Task.position >= move_in.position
        )
        .values(position=Task.position + 1)
    )

    await db.flush()

    if prev_status != move_in.status:
        await log_activity(
            db,
            project_id=task.project_id,
            task_id=task.id,
            user_id=current_user.id,
            action="TASK_MOVED",
            details=f"Moved task to '{move_in.status.value}' at position {move_in.position}"
        )
        if task.assignee_id and task.assignee_id != current_user.id:
            await create_notification(
                db,
                user_id=task.assignee_id,
                task_id=task.id,
                title="Task Moved",
                message=f"'{task.title}' moved to {move_in.status.value}",
                notification_type=NotificationType.STATUS_CHANGED
            )

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")
    return await get_task_by_id(db, task.id, current_user)


async def delete_task(
    db: AsyncSession,
    task_id: int,
    current_user: User
) -> None:
    task = await get_task_by_id(db, task_id, current_user)

    # Permission check: Admin, Project Owner/Manager, or Task Creator can delete
    project = await check_user_project_access(db, task.project_id, current_user)
    member_record = next((m for m in project.members if m.user_id == current_user.id), None)
    is_pm = member_record and member_record.role == ProjectRole.MANAGER

    if current_user.role != UserRole.ADMIN and project.owner_id != current_user.id and not is_pm and task.creator_id != current_user.id:
        raise ForbiddenException("You don't have permission to delete this task")

    await log_activity(
        db,
        project_id=task.project_id,
        user_id=current_user.id,
        action="TASK_DELETED",
        details=f"Deleted task '{task.title}'"
    )

    await db.delete(task)
    await db.flush()

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")
