from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.redis import redis_service
from app.models.notification import NotificationType
from app.models.project import Project, ProjectMember, ProjectRole, ProjectStatus
from app.models.task import Task, TaskStatus
from app.models.user import User, UserRole
from app.schemas.project import ProjectCreate, ProjectDetailResponse, ProjectMemberCreate, ProjectMemberResponse, ProjectMemberUpdate, ProjectResponse, ProjectUpdate
from app.schemas.user import UserSummary
from app.services.activity_service import log_activity
from app.services.notification_service import create_notification


async def check_user_project_access(
    db: AsyncSession,
    project_id: int,
    user: User,
    min_role: Optional[ProjectRole] = None
) -> Project:
    """Check if user has access to a project. Admins have access to everything."""
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.owner),
            selectinload(Project.members).selectinload(ProjectMember.user)
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException(f"Project with ID {project_id} not found")
    
    if user.role == UserRole.ADMIN or project.owner_id == user.id:
        return project

    # Check member role
    member_record = next((m for m in project.members if m.user_id == user.id), None)
    if not member_record:
        raise ForbiddenException("You are not a member of this project")

    if min_role == ProjectRole.MANAGER and member_record.role != ProjectRole.MANAGER:
        raise ForbiddenException("You need Project Manager permission in this project")

    return project


async def get_projects(
    db: AsyncSession,
    current_user: User,
    status: Optional[ProjectStatus] = None,
    search: Optional[str] = None
) -> List[dict]:
    cache_key = f"projects:list:{current_user.id}:{current_user.role}:{status}:{search}"
    cached = await redis_service.get(cache_key)
    if cached:
        return cached

    query = select(Project).options(
        selectinload(Project.owner),
        selectinload(Project.members)
    )

    # Admins see all, others see owned or member-of
    if current_user.role != UserRole.ADMIN:
        member_project_subquery = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
        query = query.where(
            (Project.owner_id == current_user.id) | (Project.id.in_(member_project_subquery))
        )

    if status:
        query = query.where(Project.status == status)
    if search:
        query = query.where(Project.title.ilike(f"%{search}%"))

    query = query.order_by(Project.created_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    # Enrich with task statistics
    response_list = []
    for proj in projects:
        # Count tasks and completed tasks
        task_stats = await db.execute(
            select(
                func.count(Task.id),
                func.count().filter(Task.status == TaskStatus.COMPLETED)
            ).where(Task.project_id == proj.id)
        )
        total_tasks, completed_tasks = task_stats.one()

        p_dict = {
            "id": proj.id,
            "title": proj.title,
            "description": proj.description,
            "status": proj.status.value,
            "start_date": proj.start_date.isoformat() if proj.start_date else None,
            "target_date": proj.target_date.isoformat() if proj.target_date else None,
            "owner_id": proj.owner_id,
            "created_at": proj.created_at.isoformat(),
            "updated_at": proj.updated_at.isoformat(),
            "owner": {
                "id": proj.owner.id,
                "email": proj.owner.email,
                "full_name": proj.owner.full_name,
                "role": proj.owner.role.value,
                "avatar_url": proj.owner.avatar_url
            },
            "members_count": len(proj.members),
            "tasks_count": total_tasks or 0,
            "completed_tasks_count": completed_tasks or 0
        }
        response_list.append(p_dict)

    await redis_service.set(cache_key, response_list, expire_seconds=120)
    return response_list


async def create_project(
    db: AsyncSession,
    project_in: ProjectCreate,
    current_user: User
) -> Project:
    if current_user.role == UserRole.MEMBER:
        raise ForbiddenException("Members cannot create projects. Only Admin or Project Managers can.")

    project = Project(
        title=project_in.title,
        description=project_in.description,
        status=project_in.status,
        start_date=project_in.start_date,
        target_date=project_in.target_date,
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    # Automatically add owner as MANAGER member
    owner_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=ProjectRole.MANAGER
    )
    db.add(owner_member)
    await db.flush()

    await log_activity(
        db,
        project_id=project.id,
        user_id=current_user.id,
        action="PROJECT_CREATED",
        details=f"Project '{project.title}' was created"
    )

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")

    # Reload with owner
    return await check_user_project_access(db, project.id, current_user)


async def get_project_details(
    db: AsyncSession,
    project_id: int,
    current_user: User
) -> Project:
    return await check_user_project_access(db, project_id, current_user)


async def update_project(
    db: AsyncSession,
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User
) -> Project:
    project = await check_user_project_access(db, project_id, current_user, min_role=ProjectRole.MANAGER)

    if project_in.title is not None:
        project.title = project_in.title
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status
    if project_in.start_date is not None:
        project.start_date = project_in.start_date
    if project_in.target_date is not None:
        project.target_date = project_in.target_date

    await log_activity(
        db,
        project_id=project.id,
        user_id=current_user.id,
        action="PROJECT_UPDATED",
        details=f"Project details updated"
    )
    await db.flush()

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")
    return project


async def delete_project(
    db: AsyncSession,
    project_id: int,
    current_user: User
) -> None:
    project = await check_user_project_access(db, project_id, current_user, min_role=ProjectRole.MANAGER)
    if current_user.role != UserRole.ADMIN and project.owner_id != current_user.id:
        raise ForbiddenException("Only the project owner or system admin can delete this project")

    await db.delete(project)
    await db.flush()

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")
    await redis_service.delete_pattern(f"tasks:{project_id}:*")


async def add_project_member(
    db: AsyncSession,
    project_id: int,
    member_in: ProjectMemberCreate,
    current_user: User
) -> ProjectMember:
    project = await check_user_project_access(db, project_id, current_user, min_role=ProjectRole.MANAGER)

    # Check if already member
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_in.user_id
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("User is already a member of this project")

    member = ProjectMember(
        project_id=project_id,
        user_id=member_in.user_id,
        role=member_in.role
    )
    db.add(member)
    await db.flush()

    await log_activity(
        db,
        project_id=project_id,
        user_id=current_user.id,
        action="MEMBER_ADDED",
        details=f"Added member ID {member_in.user_id} with role {member_in.role.value}"
    )

    await create_notification(
        db,
        user_id=member_in.user_id,
        title=f"Added to Project: {project.title}",
        message=f"You have been added to '{project.title}' as a {member_in.role.value}",
        notification_type=NotificationType.TASK_ASSIGNED
    )

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")

    # Fetch loaded
    res = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.id == member.id)
    )
    return res.scalar_one()


async def remove_project_member(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    current_user: User
) -> None:
    project = await check_user_project_access(db, project_id, current_user, min_role=ProjectRole.MANAGER)
    if project.owner_id == user_id:
        raise ForbiddenException("Cannot remove the project owner from members")

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise NotFoundException("Member not found in this project")

    await db.delete(member)
    await db.flush()

    await log_activity(
        db,
        project_id=project_id,
        user_id=current_user.id,
        action="MEMBER_REMOVED",
        details=f"Removed user ID {user_id} from project"
    )

    await redis_service.delete_pattern("projects:*")
    await redis_service.delete_pattern("dashboard:*")
