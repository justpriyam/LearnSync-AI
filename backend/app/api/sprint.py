import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas import SprintGenerateRequest, SprintPlanStatusResponse, SprintPlanResponse
from app.db.models import SprintPlan, Course, Document
from app.services.pipeline import run_sprint_generation

router = APIRouter(prefix="/sprint", tags=["sprint"])

@router.post("/generate", response_model=SprintPlanStatusResponse)
def generate_sprint(req: SprintGenerateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Validate both documents exist and are 'ready'
    syl_doc = db.query(Document).filter(Document.id == req.syllabus_document_id).first()
    if not syl_doc or syl_doc.status != 'ready':
        raise HTTPException(status_code=400, detail="Syllabus document not found or not ready")
        
    pyq_doc = db.query(Document).filter(Document.id == req.pyq_document_id).first()
    if not pyq_doc or pyq_doc.status != 'ready':
        raise HTTPException(status_code=400, detail="PYQ document not found or not ready")
        
    course = db.query(Course).filter(Course.document_id == req.syllabus_document_id).first()
    if not course or course.status != 'ready':
        raise HTTPException(status_code=400, detail="No ready course found for syllabus document. Please generate the course first.")
        
    sprint_id = str(uuid.uuid4())
    sprint = SprintPlan(
        id=sprint_id,
        syllabus_document_id=req.syllabus_document_id,
        pyq_document_id=req.pyq_document_id,
        course_id=course.id,
        deadline=req.deadline,
        total_days=1, # Default, will be calculated
        status='pending'
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    
    background_tasks.add_task(run_sprint_generation, sprint_id)
    
    return sprint

@router.get("/{sprint_id}", response_model=SprintPlanResponse)
def get_sprint(sprint_id: str, db: Session = Depends(get_db)):
    sprint = db.query(SprintPlan).filter(SprintPlan.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint plan not found")
    return sprint
