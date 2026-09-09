from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
from app.database import get_db
from app.models import Document, InterviewSession
from app.config import settings
from app.services.embedder import client as chroma_client

router = APIRouter(prefix="/admin", tags=["admin"])

@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete from ChromaDB
    collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}{document_id}"
    try:
        chroma_client.delete_collection(name=collection_name)
    except Exception:
        pass # Collection might not exist if it failed early
        
    # Delete from Postgres
    # Since Document lacks a cascade relationship in ORM, we manually delete courses and sprint plans
    from app.models import Course, SprintPlan
    courses = db.query(Course).filter(Course.document_id == document_id).all()
    for c in courses:
        db.delete(c)
        
    sprints = db.query(SprintPlan).filter(
        (SprintPlan.syllabus_document_id == document_id) | 
        (SprintPlan.pyq_document_id == document_id)
    ).all()
    for s in sprints:
        db.delete(s)
        
    db.delete(doc)
    db.commit()
    
    # Delete file from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass # Avoid failing the whole request if file is locked/missing
            
    return {"message": "Document and all related artifacts deleted successfully"}

@router.delete("/interviews/{session_id}")
def delete_interview(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    # Delete session (cascade handles turns)
    db.delete(session)
    db.commit()
    
    return {"message": "Interview session and all turns deleted successfully"}
