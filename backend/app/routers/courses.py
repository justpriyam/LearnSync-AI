import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, Course
from app.schemas import CourseResponse, CourseStatusResponse, TopicCourseRequest
from app.services.pipeline import run_generation, run_topic_course_generation

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("", response_model=list[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    return db.query(Course).all()

@router.post("/from-topic")
def generate_course_from_topic(req: TopicCourseRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    course_id = str(uuid.uuid4())
    course = Course(id=course_id, topic_name=req.topic_name, title=f"Course: {req.topic_name}", status='pending')
    db.add(course)
    db.commit()
    background_tasks.add_task(run_topic_course_generation, course_id, req.depth)
    return {"id": course_id, "status": "pending"}

@router.post("/{document_id}/generate", response_model=CourseStatusResponse)
def generate_course(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is not ready for generation")
        
    course_id = str(uuid.uuid4())
    # Auto-generate title from document filename
    title = f"Course: {doc.filename.rsplit('.', 1)[0]}"
    course = Course(
        id=course_id,
        document_id=document_id,
        title=title,
        status="pending"
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    
    background_tasks.add_task(run_generation, course_id)
    return course

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
