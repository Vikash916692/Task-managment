from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException, UnauthorizedException
from app.core.security import create_access_token, create_refresh_token, decode_token, get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
    existing = await get_user_by_email(db, user_in.email)
    if existing:
        raise ConflictException(f"User with email '{user_in.email}' already exists")
    
    user = User(
        email=user_in.email.lower(),
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
        avatar_url=user_in.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={user_in.full_name}"
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, login_data: LoginRequest) -> TokenResponse:
    user = await get_user_by_email(db, login_data.email)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password")
    
    if not user.is_active:
        raise UnauthorizedException("Your account is deactivated. Contact an administrator.")
    
    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email
    )
    refresh_token = create_refresh_token(subject=user.id)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


async def refresh_user_token(db: AsyncSession, refresh_token: str) -> TokenResponse:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid refresh token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid refresh token subject")
    
    user = await get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")
    
    new_access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
        email=user.email
    )
    new_refresh_token = create_refresh_token(subject=user.id)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


async def list_users(
    db: AsyncSession,
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    limit: int = 100,
    offset: int = 0
) -> List[User]:
    query = select(User)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter)
            )
        )
    if role:
        query = query.where(User.role == role)
    
    query = query.order_by(User.full_name).limit(limit).offset(offset)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_user(
    db: AsyncSession,
    user_id: int,
    user_update: UserUpdate
) -> User:
    user = await get_user_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    
    if user_update.email and user_update.email.lower() != user.email:
        existing = await get_user_by_email(db, user_update.email)
        if existing:
            raise ConflictException(f"Email '{user_update.email}' is already taken")
        user.email = user_update.email.lower()
    
    if user_update.full_name:
        user.full_name = user_update.full_name
    if user_update.role:
        user.role = user_update.role
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.avatar_url is not None:
        user.avatar_url = user_update.avatar_url
    if user_update.password:
        user.hashed_password = get_password_hash(user_update.password)
    
    await db.flush()
    return user
