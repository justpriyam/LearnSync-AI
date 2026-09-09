import uuid
import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document
from app.schemas import DocumentResponse, DocumentStatusResponse, TextDocumentRequest
from app.config import settings
from app.services.pipeline import run_ingestion, run_text_ingestion

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/text", response_model=DocumentResponse)
def create_text_document(
    request: TextDocumentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    text = request.text.strip()
    if len(text) < 20:
        raise HTTPException(status_code=400, detail="Job description text is too short.")

    doc_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = Path(request.filename).name or "job-description.txt"
    file_path = upload_dir / f"{doc_id}_{safe_filename}"
    file_path.write_text(text, encoding="utf-8")

    doc = Document(
        id=doc_id,
        filename=safe_filename,
        file_path=str(file_path),
        doc_type="job_description",
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    background_tasks.add_task(run_text_ingestion, doc_id)
    return doc

@router.post("", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    filename = file.filename or "upload.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    doc_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{doc_id}_{Path(filename).name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    size_mb = file_path.stat().st_size / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        file_path.unlink()
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB")

    doc = Document(
        id=doc_id,
        filename=filename,
        file_path=str(file_path),
        doc_type="textbook",
        status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    background_tasks.add_task(run_ingestion, doc_id)
    return doc

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return db.query(Document).all()
