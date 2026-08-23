from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.user import UserSummary


class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)


class CommentCreate(CommentBase):
    pass


class CommentResponse(CommentBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    author: UserSummary

    model_config = ConfigDict(from_attributes=True)
