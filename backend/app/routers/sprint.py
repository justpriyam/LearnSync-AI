import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import SprintGenerateRequest, SprintPlanStatusResponse, SprintPlanResponse, TopicSprintRequest
from app.models import SprintPlan, Course, Document
from app.services.pipeline import run_sprint_generation, run_sprint_generation_after_course, run_generation, run_topic_sprint_generation

router = APIRouter(prefix="/sprint", tags=["sprint"])

@router.get("", response_model=list[SprintPlanResponse])
def list_sprints(db: Session = Depends(get_db)):
    return db.query(SprintPlan).all()

@router.post("/from-topic")
def generate_sprint_from_topic(req: TopicSprintRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    sprint_id = str(uuid.uuid4())
    sprint = SprintPlan(id=sprint_id, topic_name=req.topic_name, deadline=req.deadline, hours_per_day=req.hours_per_day, total_days=0, status='pending')
    db.add(sprint)
    db.commit()
    background_tasks.add_task(run_topic_sprint_generation, sprint_id)
    return {"id": sprint_id, "status": "pending"}

@router.post("/generate", response_model=SprintPlanStatusResponse)
def generate_sprint(req: SprintGenerateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Validate both documents exist and are 'ready'
    syl_doc = db.query(Document).filter(Document.id == req.syllabus_document_id).first()
    if not syl_doc or syl_doc.status != 'ready':
        raise HTTPException(status_code=400, detail="Syllabus document not found or not ready")
        
    pyq_doc = db.query(Document).filter(Document.id == req.pyq_document_id).first()
    if not pyq_doc or pyq_doc.status != 'ready':
        raise HTTPException(status_code=400, detail="PYQ document not found or not ready")
        
    course = db.query(Course).filter(Course.document_id == req.syllabus_document_id).order_by(Course.created_at.desc()).first()
    needs_course_generation = not course or course.status == "failed"
    if needs_course_generation:
        course = Course(
            id=str(uuid.uuid4()),
            document_id=req.syllabus_document_id,
            title=f"Course: {syl_doc.filename.rsplit('.', 1)[0]}",
            status="pending",
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        
    sprint_id = str(uuid.uuid4())
    sprint = SprintPlan(
        id=sprint_id,
        syllabus_document_id=req.syllabus_document_id,
        pyq_document_id=req.pyq_document_id,
        course_id=course.id,
        deadline=req.deadline,
        total_days=1, # Default, will be updated
        status='pending'
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    
    if course.status == "ready":
        background_tasks.add_task(run_sprint_generation, sprint_id)
    else:
        if needs_course_generation:
            background_tasks.add_task(run_generation, course.id)
        background_tasks.add_task(run_sprint_generation_after_course, sprint_id, course.id)
    
    return sprint

@router.get("/{sprint_id}", response_model=SprintPlanResponse)
def get_sprint(sprint_id: str, db: Session = Depends(get_db)):
    sprint = db.query(SprintPlan).filter(SprintPlan.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint plan not found")
    return sprint
