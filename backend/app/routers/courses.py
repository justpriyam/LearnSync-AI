import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, Course
from app.schemas import CourseResponse, CourseStatusResponse
from app.services.pipeline import run_generation
from app.auth_middleware import get_current_user

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseResponse])
def list_courses(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """List all courses for the current user."""
    return (
        db.query(Course)
        .filter(Course.user_id == user_id)
        .order_by(Course.created_at.desc())
        .all()
    )


@router.post("/{document_id}/generate", response_model=CourseStatusResponse)
def generate_course(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is not ready for generation")

    course_id = str(uuid.uuid4())
    title = f"Course: {doc.filename.rsplit('.', 1)[0]}"
    course = Course(
        id=course_id,
        user_id=user_id,
        document_id=document_id,
        title=title,
        status="pending",
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    background_tasks.add_task(run_generation, course_id)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.user_id == user_id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
