from typing import AsyncGenerator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Validate Bearer JWT token and return the current active User."""
    credentials_exception = UnauthorizedException("Could not validate credentials")
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: Optional[str] = payload.get("sub")
    token_type: Optional[str] = payload.get("type")
    if user_id is None or token_type != "access":
        raise credentials_exception
    
    try:
        user_id_int = int(user_id)
    except ValueError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id_int))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise ForbiddenException("User account is deactivated")
        
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user


class RoleChecker:
    """Dependency that ensures current_user has one of the required roles."""
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(
                f"Action requires one of the following roles: {[r.value for r in self.allowed_roles]}"
            )
        return current_user


# Role dependency shortcuts
require_admin = RoleChecker([UserRole.ADMIN])
require_manager_or_admin = RoleChecker([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
require_authenticated = get_current_active_user
