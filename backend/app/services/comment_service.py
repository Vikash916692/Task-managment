from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.comment import Comment
from app.models.notification import NotificationType
from app.models.project import ProjectRole
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.activity_service import log_activity
from app.services.notification_service import create_notification
from app.services.task_service import get_task_by_id


async def get_task_comments(
    db: AsyncSession,
    task_id: int,
    current_user: User
) -> List[Comment]:
    # Ensure task access
    await get_task_by_id(db, task_id, current_user)

    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
    )
    return list(result.scalars().all())


async def create_comment(
    db: AsyncSession,
    task_id: int,
    comment_in: CommentCreate,
    current_user: User
) -> Comment:
    task = await get_task_by_id(db, task_id, current_user)

    comment = Comment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_in.content
    )
    db.add(comment)
    await db.flush()

    await log_activity(
        db,
        project_id=task.project_id,
        task_id=task.id,
        user_id=current_user.id,
        action="COMMENT_ADDED",
        details=f"Commented on task '{task.title}'"
    )

    # Notify assignee if someone else commented
    if task.assignee_id and task.assignee_id != current_user.id:
        await create_notification(
            db,
            user_id=task.assignee_id,
            task_id=task.id,
            title="New Comment on Task",
            message=f"{current_user.full_name} commented on '{task.title}'",
            notification_type=NotificationType.COMMENT_ADDED
        )

    # Notify creator if different from assignee and commenter
    if task.creator_id != current_user.id and task.creator_id != task.assignee_id:
        await create_notification(
            db,
            user_id=task.creator_id,
            task_id=task.id,
            title="New Comment on Task",
            message=f"{current_user.full_name} commented on '{task.title}'",
            notification_type=NotificationType.COMMENT_ADDED
        )

    # Fetch loaded
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.id == comment.id)
    )
    return result.scalar_one()


async def delete_comment(
    db: AsyncSession,
    comment_id: int,
    current_user: User
) -> None:
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise NotFoundException("Comment not found")

    if current_user.role != UserRole.ADMIN and comment.user_id != current_user.id:
        raise ForbiddenException("You can only delete your own comments")

    await db.delete(comment)
    await db.flush()
