import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document, InterviewSession, InterviewTurn
from app.schemas import (
    InterviewStartRequest, InterviewStartResponse, InterviewTurnRequest, 
    InterviewTurnResponse, InterviewReportResponse, EvaluationSchema
)
from app.config import settings
from app.services.interviewer import (
    generate_opening_question, evaluate_answer, decide_next_difficulty, 
    generate_next_question, generate_report
)
from app.services.embedder import client as chroma_client

router = APIRouter(prefix="/interview", tags=["interview"])

def get_document_chunks(doc_id: str):
    collection_name = f"{settings.CHROMA_COLLECTION_PREFIX}{doc_id}"
    try:
        collection = chroma_client.get_collection(name=collection_name)
        results = collection.get()
        if not results or not results.get('ids'):
            return []
        return [{"id": id, "text": doc} for id, doc in zip(results['ids'], results['documents'])]
    except Exception:
        return []

@router.post("/start", response_model=InterviewStartResponse)
def start_interview(req: InterviewStartRequest, db: Session = Depends(get_db)):
    resume = db.query(Document).filter(Document.id == req.resume_document_id).first()
    jd = db.query(Document).filter(Document.id == req.jd_document_id).first()
    
    if not resume or resume.status != 'ready':
        raise HTTPException(status_code=400, detail="Resume not found or not ready")
    if not jd or jd.status != 'ready':
        raise HTTPException(status_code=400, detail="Job description not found or not ready")
        
    resume_chunks = get_document_chunks(req.resume_document_id)
    jd_chunks = get_document_chunks(req.jd_document_id)
    
    opening_q = "Hi! Tell me about yourself and your background"
    
    session = InterviewSession(
        id=str(uuid.uuid4()),
        resume_document_id=req.resume_document_id,
        jd_document_id=req.jd_document_id,
        status='active',
        current_difficulty='intermediate',
        current_question=opening_q
    )
    db.add(session)
    db.commit()
    
    return InterviewStartResponse(
        session_id=session.id,
        opening_question=opening_q,
        difficulty_level=session.current_difficulty
    )

@router.post("/{session_id}/turn", response_model=InterviewTurnResponse)
def submit_turn(session_id: str, req: InterviewTurnRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    if session.status != 'active':
        raise HTTPException(status_code=400, detail="Interview session is already completed")
        
    turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_number).all()
    turn_number = len(turns) + 1
    
    resume_chunks = get_document_chunks(session.resume_document_id)
    jd_chunks = get_document_chunks(session.jd_document_id)
    
    resume_context = json.dumps([c.get("text", "") for c in resume_chunks])
    jd_context = json.dumps([c.get("text", "") for c in jd_chunks])
    
    answered_question = session.current_question or "Please proceed."
    answered_difficulty = session.current_difficulty
    
    evaluation = evaluate_answer(
        question=answered_question,
        answer=req.answer_text,
        resume_context=resume_context,
        jd_context=jd_context,
        difficulty=answered_difficulty
    )
    
    next_difficulty = decide_next_difficulty(
        current_difficulty=answered_difficulty,
        score=evaluation["score"],
        escalation_threshold=settings.DIFFICULTY_ESCALATION_THRESHOLD,
        pivot_threshold=settings.DIFFICULTY_PIVOT_THRESHOLD
    )
    
    is_complete = False
    next_q = None
    
    if turn_number >= settings.MAX_INTERVIEW_TURNS:
        is_complete = True
        session.status = 'completed'
        session.current_question = None
    else:
        previous_turns = [{"question": t.question, "answer": t.answer, "score": t.score} for t in turns]
        previous_turns.append({
            "question": answered_question,
            "answer": req.answer_text,
            "score": evaluation["score"]
        })
        next_q = generate_next_question(resume_chunks, jd_chunks, previous_turns, next_difficulty)
        session.current_difficulty = next_difficulty
        session.current_question = next_q
        
    turn = InterviewTurn(
        id=str(uuid.uuid4()),
        session_id=session.id,
        turn_number=turn_number,
        question=answered_question,
        answer=req.answer_text,
        score=evaluation["score"],
        feedback=evaluation["feedback"],
        difficulty_level=answered_difficulty,
        strengths=json.dumps(evaluation["strengths"]),
        weaknesses=json.dumps(evaluation["weaknesses"])
    )
    db.add(turn)
    db.commit()
    
    return InterviewTurnResponse(
        turn_number=turn_number,
        evaluation=EvaluationSchema(**evaluation),
        next_question=next_q,
        difficulty_level=next_difficulty,
        is_session_complete=is_complete
    )
    
@router.get("/{session_id}/report", response_model=InterviewReportResponse)
def get_report(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    if session.report_json:
        report_data = json.loads(session.report_json)
        return InterviewReportResponse(**report_data)

    turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_number).all()
    
    resume_chunks = get_document_chunks(session.resume_document_id)
    jd_chunks = get_document_chunks(session.jd_document_id)
    resume_context = json.dumps([c.get("text", "") for c in resume_chunks])
    jd_context = json.dumps([c.get("text", "") for c in jd_chunks])
    
    turn_dicts = []
    for t in turns:
        turn_dicts.append({
            "turn_number": t.turn_number,
            "question": t.question,
            "answer": t.answer,
            "score": t.score,
            "feedback": t.feedback,
            "difficulty_level": t.difficulty_level,
        })
        
    report = generate_report(turn_dicts, resume_context, jd_context)
    
    report_response = InterviewReportResponse(
        session_id=session_id,
        total_turns=len(turns),
        average_score=report.get("average_score", 0),
        difficulty_progression=report.get("difficulty_progression", []),
        topic_coverage=report.get("topic_coverage", []),
        strengths=report.get("strengths", []),
        weaknesses=report.get("weaknesses", []),
        suggestions=report.get("suggestions", []),
        turns=turn_dicts
    )
    
    session.report_json = report_response.model_dump_json()
    db.commit()
    
    return report_response
