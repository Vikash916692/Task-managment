import logging
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash
from app.models.activity import ActivityLog
from app.models.comment import Comment
from app.models.notification import Notification, NotificationType
from app.models.project import Project, ProjectMember, ProjectRole, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User, UserRole

logger = logging.getLogger("taskflow.seed")


async def seed_database(db: AsyncSession):
    """Seed or synchronize demonstration data."""
    user_check = await db.execute(select(User).limit(1))
    first_user = user_check.scalar_one_or_none()

    # Standard clean display names mapping
    name_updates = {
        "admin@taskflow.dev": "Admin",
        "pm@taskflow.dev": "Project Manager",
        "member@taskflow.dev": "Member",
        "sarah@taskflow.dev": "Contributor",
        "alex@taskflow.dev": "Developer",
    }

    if first_user:
        # Synchronize existing user names if needed
        for email, clean_name in name_updates.items():
            await db.execute(
                update(User)
                .where(User.email == email)
                .values(full_name=clean_name)
            )
        
        # Ensure Admin also has assigned tasks
        admin_res = await db.execute(select(User).where(User.email == "admin@taskflow.dev"))
        admin_obj = admin_res.scalar_one_or_none()
        if admin_obj:
            await db.execute(
                update(Task)
                .where(Task.title.ilike("%Pytest%") | Task.title.ilike("%Security%"))
                .values(assignee_id=admin_obj.id)
            )
        await db.commit()
        logger.info("Synchronized user display names and task assignments successfully.")
        return

    logger.info("Seeding initial demonstration data...")

    # 1. Demo Users
    users_data = [
        {
            "email": "admin@taskflow.dev",
            "full_name": "Admin",
            "password": "Admin@123456",
            "role": UserRole.ADMIN,
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        },
        {
            "email": "pm@taskflow.dev",
            "full_name": "Project Manager",
            "password": "Manager@123456",
            "role": UserRole.PROJECT_MANAGER,
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        },
        {
            "email": "member@taskflow.dev",
            "full_name": "Member",
            "password": "Member@123456",
            "role": UserRole.MEMBER,
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
        },
        {
            "email": "sarah@taskflow.dev",
            "full_name": "Contributor",
            "password": "Member@123456",
            "role": UserRole.MEMBER,
            "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
        },
        {
            "email": "alex@taskflow.dev",
            "full_name": "Developer",
            "password": "Member@123456",
            "role": UserRole.MEMBER,
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
        },
    ]

    created_users = {}
    for u in users_data:
        user = User(
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=get_password_hash(u["password"]),
            role=u["role"],
            is_active=True,
            avatar_url=u["avatar_url"]
        )
        db.add(user)
        await db.flush()
        created_users[u["email"]] = user

    admin_user = created_users["admin@taskflow.dev"]
    pm_user = created_users["pm@taskflow.dev"]
    dev_user = created_users["member@taskflow.dev"]
    sarah_user = created_users["sarah@taskflow.dev"]
    alex_user = created_users["alex@taskflow.dev"]

    today = date.today()

    # 2. Project 1: Cloud Architecture Migration
    p1 = Project(
        title="Cloud Architecture & Microservices Migration",
        description="Migrating monolith services to AWS ECS containers with MySQL 8.0 RDS and Redis ElastiCache cluster.",
        status=ProjectStatus.ACTIVE,
        owner_id=pm_user.id,
        start_date=today - timedelta(days=14),
        target_date=today + timedelta(days=45),
    )
    db.add(p1)
    await db.flush()

    # Project 1 Members
    p1_members = [
        ProjectMember(project_id=p1.id, user_id=pm_user.id, role=ProjectRole.MANAGER),
        ProjectMember(project_id=p1.id, user_id=admin_user.id, role=ProjectRole.MANAGER),
        ProjectMember(project_id=p1.id, user_id=dev_user.id, role=ProjectRole.CONTRIBUTOR),
        ProjectMember(project_id=p1.id, user_id=alex_user.id, role=ProjectRole.CONTRIBUTOR),
    ]
    db.add_all(p1_members)

    # 3. Project 2: Mobile App v2.0 UI/UX
    p2 = Project(
        title="Mobile App v2.0 UI/UX Redesign",
        description="Complete overhaul of the cross-platform React Native client with sleek dark mode, micro-interactions, and offline sync.",
        status=ProjectStatus.ACTIVE,
        owner_id=pm_user.id,
        start_date=today - timedelta(days=7),
        target_date=today + timedelta(days=30),
    )
    db.add(p2)
    await db.flush()

    p2_members = [
        ProjectMember(project_id=p2.id, user_id=pm_user.id, role=ProjectRole.MANAGER),
        ProjectMember(project_id=p2.id, user_id=sarah_user.id, role=ProjectRole.CONTRIBUTOR),
        ProjectMember(project_id=p2.id, user_id=dev_user.id, role=ProjectRole.CONTRIBUTOR),
    ]
    db.add_all(p2_members)

    # 4. Project 3: Zero-Trust Security Audit
    p3 = Project(
        title="Zero-Trust Security & SOC2 Compliance",
        description="Implementing role-based access control, automated vulnerability scanning, and audit trail logging for SOC2 certification.",
        status=ProjectStatus.PLANNING,
        owner_id=admin_user.id,
        start_date=today,
        target_date=today + timedelta(days=60),
    )
    db.add(p3)
    await db.flush()

    p3_members = [
        ProjectMember(project_id=p3.id, user_id=admin_user.id, role=ProjectRole.MANAGER),
        ProjectMember(project_id=p3.id, user_id=alex_user.id, role=ProjectRole.CONTRIBUTOR),
    ]
    db.add_all(p3_members)
    await db.flush()

    # 5. Project 1 Tasks
    p1_tasks_data = [
        {
            "title": "Setup Docker Compose environment with MySQL & Redis",
            "description": "Configure multi-container orchestration with automatic healthcheck and network bridging.",
            "status": TaskStatus.COMPLETED,
            "priority": TaskPriority.HIGH,
            "due_date": today - timedelta(days=2),
            "position": 1,
            "tags": ["DevOps", "Docker", "Database"],
            "creator_id": pm_user.id,
            "assignee_id": alex_user.id
        },
        {
            "title": "Implement JWT Authentication & RBAC Middleware",
            "description": "Secure all REST routes with OAuth2 Bearer tokens and verify Admin, PM, and Member scopes.",
            "status": TaskStatus.COMPLETED,
            "priority": TaskPriority.URGENT,
            "due_date": today - timedelta(days=1),
            "position": 2,
            "tags": ["Security", "FastAPI", "Auth"],
            "creator_id": pm_user.id,
            "assignee_id": dev_user.id
        },
        {
            "title": "Build Async Redis Caching Layer",
            "description": "Add intelligent cache invalidation on task and project mutations with graceful fallback.",
            "status": TaskStatus.IN_PROGRESS,
            "priority": TaskPriority.HIGH,
            "due_date": today + timedelta(days=3),
            "position": 1,
            "tags": ["Redis", "Caching", "Performance"],
            "creator_id": pm_user.id,
            "assignee_id": dev_user.id
        },
        {
            "title": "Design Kanban Drag-and-Drop Board",
            "description": "Integrate fluid drag-and-drop column transitions with optimistic UI updates.",
            "status": TaskStatus.IN_PROGRESS,
            "priority": TaskPriority.MEDIUM,
            "due_date": today + timedelta(days=5),
            "position": 2,
            "tags": ["Frontend", "React", "UX"],
            "creator_id": pm_user.id,
            "assignee_id": sarah_user.id
        },
        {
            "title": "Optimize SQL indexing on search and filter columns",
            "description": "Add composite indexes on (project_id, status, priority) for sub-millisecond query execution.",
            "status": TaskStatus.REVIEW,
            "priority": TaskPriority.MEDIUM,
            "due_date": today + timedelta(days=6),
            "position": 1,
            "tags": ["Database", "Optimization"],
            "creator_id": pm_user.id,
            "assignee_id": alex_user.id
        },
        {
            "title": "Implement real-time notification alerts for deadlines",
            "description": "Send alerts when a task assignment occurs or a deadline is approaching within 48 hours.",
            "status": TaskStatus.TODO,
            "priority": TaskPriority.MEDIUM,
            "due_date": today + timedelta(days=10),
            "position": 1,
            "tags": ["Notifications", "Backend"],
            "creator_id": pm_user.id,
            "assignee_id": dev_user.id
        },
        {
            "title": "End-to-End Pytest integration test suite",
            "description": "Validate auth flow, project membership permissions, and task status reordering.",
            "status": TaskStatus.TODO,
            "priority": TaskPriority.HIGH,
            "due_date": today + timedelta(days=12),
            "position": 2,
            "tags": ["Testing", "Pytest", "QA"],
            "creator_id": pm_user.id,
            "assignee_id": admin_user.id
        },
    ]

    for t_data in p1_tasks_data:
        task = Task(
            project_id=p1.id,
            title=t_data["title"],
            description=t_data["description"],
            status=t_data["status"],
            priority=t_data["priority"],
            due_date=t_data["due_date"],
            position=t_data["position"],
            tags=t_data["tags"],
            creator_id=t_data["creator_id"],
            assignee_id=t_data["assignee_id"]
        )
        db.add(task)
        await db.flush()

        if t_data["title"].startswith("Setup Docker"):
            c1 = Comment(
                task_id=task.id,
                user_id=pm_user.id,
                content="Please ensure the MySQL container includes the healthcheck probe before starting FastAPI."
            )
            c2 = Comment(
                task_id=task.id,
                user_id=alex_user.id,
                content="Done! Added `mysqladmin ping` with a 5s retry interval in docker-compose.yml."
            )
            db.add_all([c1, c2])

    # 6. Project 2 Tasks
    p2_tasks_data = [
        {
            "title": "Design dark mode palette and glassmorphism styling",
            "description": "Create Tailwind CSS color tokens for slate/indigo palette and responsive sidebar navigation.",
            "status": TaskStatus.COMPLETED,
            "priority": TaskPriority.HIGH,
            "due_date": today - timedelta(days=1),
            "position": 1,
            "tags": ["Design", "TailwindCSS"],
            "creator_id": pm_user.id,
            "assignee_id": sarah_user.id
        },
        {
            "title": "Build interactive analytics charts and metrics cards",
            "description": "Render task completion rate, workload distribution bar charts, and priority breakdowns.",
            "status": TaskStatus.IN_PROGRESS,
            "priority": TaskPriority.URGENT,
            "due_date": today + timedelta(days=2),
            "position": 1,
            "tags": ["Analytics", "Charts", "Dashboard"],
            "creator_id": pm_user.id,
            "assignee_id": sarah_user.id
        },
        {
            "title": "Filter & pagination bar with debounce search",
            "description": "Support multi-select priority filters, due date ranges, and assignee avatars.",
            "status": TaskStatus.TODO,
            "priority": TaskPriority.LOW,
            "due_date": today + timedelta(days=8),
            "position": 1,
            "tags": ["Frontend", "UX"],
            "creator_id": pm_user.id,
            "assignee_id": dev_user.id
        }
    ]

    for t_data in p2_tasks_data:
        task = Task(
            project_id=p2.id,
            title=t_data["title"],
            description=t_data["description"],
            status=t_data["status"],
            priority=t_data["priority"],
            due_date=t_data["due_date"],
            position=t_data["position"],
            tags=t_data["tags"],
            creator_id=t_data["creator_id"],
            assignee_id=t_data["assignee_id"]
        )
        db.add(task)

    # 7. Project 3 Tasks (Assigned to Admin)
    p3_tasks_data = [
        {
            "title": "Configure Role-Based Access Control policies",
            "description": "Review Admin, Manager, and Member permission boundaries.",
            "status": TaskStatus.IN_PROGRESS,
            "priority": TaskPriority.HIGH,
            "due_date": today + timedelta(days=15),
            "position": 1,
            "tags": ["Security", "RBAC"],
            "creator_id": admin_user.id,
            "assignee_id": admin_user.id
        }
    ]
    for t_data in p3_tasks_data:
        task = Task(
            project_id=p3.id,
            title=t_data["title"],
            description=t_data["description"],
            status=t_data["status"],
            priority=t_data["priority"],
            due_date=t_data["due_date"],
            position=t_data["position"],
            tags=t_data["tags"],
            creator_id=t_data["creator_id"],
            assignee_id=t_data["assignee_id"]
        )
        db.add(task)

    # 8. Notifications
    sample_notifs = [
        Notification(
            user_id=dev_user.id,
            title="Task Assigned: Build Async Redis Caching Layer",
            message="Project Manager assigned you to 'Build Async Redis Caching Layer'",
            type=NotificationType.TASK_ASSIGNED,
            is_read=False
        ),
        Notification(
            user_id=dev_user.id,
            title="Approaching Deadline: Implement JWT Authentication",
            message="Task due date is approaching tomorrow",
            type=NotificationType.DEADLINE_NEAR,
            is_read=True
        ),
        Notification(
            user_id=sarah_user.id,
            title="New Project: Mobile App v2.0 UI/UX Redesign",
            message="You were added as Contributor to Mobile App v2.0 UI/UX Redesign",
            type=NotificationType.TASK_ASSIGNED,
            is_read=False
        ),
    ]
    db.add_all(sample_notifs)

    # 9. Activity logs
    sample_activities = [
        ActivityLog(
            project_id=p1.id,
            user_id=pm_user.id,
            action="PROJECT_CREATED",
            details="Created project 'Cloud Architecture & Microservices Migration'"
        ),
        ActivityLog(
            project_id=p1.id,
            user_id=alex_user.id,
            action="TASK_COMPLETED",
            details="Completed 'Setup Docker Compose environment with MySQL & Redis'"
        ),
        ActivityLog(
            project_id=p1.id,
            user_id=dev_user.id,
            action="TASK_COMPLETED",
            details="Completed 'Implement JWT Authentication & RBAC Middleware'"
        ),
        ActivityLog(
            project_id=p2.id,
            user_id=pm_user.id,
            action="PROJECT_CREATED",
            details="Created project 'Mobile App v2.0 UI/UX Redesign'"
        ),
    ]
    db.add_all(sample_activities)

    await db.commit()
    logger.info("Initial demonstration dataset successfully seeded.")
