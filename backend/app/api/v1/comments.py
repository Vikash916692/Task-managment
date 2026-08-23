from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.comment_service import create_comment, delete_comment, get_task_comments

router = APIRouter(prefix="/tasks/{task_id}/comments", tags=["Comments"])


@router.get("", response_model=List[CommentResponse])
async def list_comments(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List comments on a task."""
    return await get_task_comments(db, task_id, current_user)


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def post_comment(
    task_id: int,
    comment_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new comment to a task."""
    return await create_comment(db, task_id, comment_in, current_user)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_comment(
    task_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment."""
    await delete_comment(db, comment_id, current_user)
