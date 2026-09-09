from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Document, Course, SprintPlan, InterviewSession
from app.auth_middleware import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class RecentItem(BaseModel):
    id: str
    type: str  # 'course', 'sprint', 'interview', 'document'
    title: str
    status: str
    created_at: str


class DashboardSummary(BaseModel):
    documents_count: int
    courses_count: int
    sprints_count: int
    interviews_count: int
    recent_activity: list[RecentItem]


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dashboard summary for the current user."""
    docs_count = db.query(func.count(Document.id)).filter(Document.user_id == user_id).scalar() or 0
    courses_count = db.query(func.count(Course.id)).filter(Course.user_id == user_id).scalar() or 0
    sprints_count = db.query(func.count(SprintPlan.id)).filter(SprintPlan.user_id == user_id).scalar() or 0
    interviews_count = db.query(func.count(InterviewSession.id)).filter(InterviewSession.user_id == user_id).scalar() or 0

    # Recent activity: last 8 items across all types
    recent: list[RecentItem] = []

    recent_courses = (
        db.query(Course)
        .filter(Course.user_id == user_id)
        .order_by(Course.created_at.desc())
        .limit(3)
        .all()
    )
    for c in recent_courses:
        recent.append(RecentItem(
            id=c.id, type="course", title=c.title,
            status=c.status, created_at=c.created_at.isoformat(),
        ))

    recent_sprints = (
        db.query(SprintPlan)
        .filter(SprintPlan.user_id == user_id)
        .order_by(SprintPlan.created_at.desc())
        .limit(3)
        .all()
    )
    for s in recent_sprints:
        recent.append(RecentItem(
            id=s.id, type="sprint", title=f"Sprint Plan (due {s.deadline})",
            status=s.status, created_at=s.created_at.isoformat(),
        ))

    recent_interviews = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.created_at.desc())
        .limit(2)
        .all()
    )
    for i in recent_interviews:
        recent.append(RecentItem(
            id=i.id, type="interview", title=f"Mock Interview",
            status=i.status, created_at=i.created_at.isoformat(),
        ))

    # Sort all recent items by created_at descending
    recent.sort(key=lambda x: x.created_at, reverse=True)

    return DashboardSummary(
        documents_count=docs_count,
        courses_count=courses_count,
        sprints_count=sprints_count,
        interviews_count=interviews_count,
        recent_activity=recent[:8],
    )
