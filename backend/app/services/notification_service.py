from typing import List, Optional
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationResponse


async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType,
    task_id: Optional[int] = None
) -> Notification:
    """Create a notification for a user."""
    notif = Notification(
        user_id=user_id,
        task_id=task_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False
    )
    db.add(notif)
    await db.flush()
    return notif


async def get_user_notifications(
    db: AsyncSession,
    user_id: int,
    limit: int = 20,
    unread_only: bool = False
) -> List[Notification]:
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(desc(Notification.created_at)).limit(limit)
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False
    )
    result = await db.execute(query)
    return len(result.scalars().all())


async def mark_notification_as_read(
    db: AsyncSession,
    notification_id: int,
    user_id: int
) -> Optional[Notification]:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.flush()
    return notif


async def mark_all_notifications_as_read(
    db: AsyncSession,
    user_id: int
) -> int:
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    await db.flush()
    return result.rowcount
