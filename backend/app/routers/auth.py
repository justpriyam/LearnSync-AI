from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class UserSyncRequest(BaseModel):
    google_id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/sync", response_model=UserResponse)
def sync_user(req: UserSyncRequest, db: Session = Depends(get_db)):
    """Create or update user after Google sign-in. Called by frontend on login."""
    user = db.query(User).filter(User.id == req.google_id).first()
    if user:
        user.email = req.email
        user.name = req.name
        user.avatar_url = req.avatar_url
        user.last_login = datetime.utcnow()
    else:
        user = User(
            id=req.google_id,
            email=req.email,
            name=req.name,
            avatar_url=req.avatar_url,
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
