from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db, require_admin
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserSummary, UserUpdate
from app.services.auth_service import get_user_by_id, list_users, update_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserSummary])
async def get_all_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List system users for assignment and member selection."""
    users = await list_users(db, search=search, role=role, limit=limit, offset=offset)
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a specific user."""
    return await get_user_by_id(db, user_id)


@router.patch("/{user_id}", response_model=UserResponse)
async def patch_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile or role (Admin can edit any user, normal users can edit own profile)."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        user_update.role = None  # Non-admin cannot alter role
        user_update.is_active = None
    return await update_user(db, user_id, user_update)
