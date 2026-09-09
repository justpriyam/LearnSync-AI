from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
from app.database import get_db
from app.models import Document, InterviewSession
from app.config import settings
from app.services.embedder import client as chroma_client
from app.auth_middleware import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from ChromaDB
    collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}{document_id}"
    try:
        chroma_client.delete_collection(name=collection_name)
    except Exception:
        pass

    # Delete related records
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

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    return {"message": "Document and all related artifacts deleted successfully"}


@router.delete("/interviews/{session_id}")
def delete_interview(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    db.delete(session)
    db.commit()

    return {"message": "Interview session and all turns deleted successfully"}
