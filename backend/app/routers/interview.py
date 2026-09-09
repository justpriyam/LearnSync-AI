import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
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
from app.auth_middleware import get_current_user

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


class InterviewSessionSummary:
    """Pydantic model for interview session list items."""
    pass


from pydantic import BaseModel
from datetime import datetime as dt


class SessionListItem(BaseModel):
    id: str
    status: str
    current_difficulty: str
    created_at: str
    turn_count: int
    average_score: float | None = None


class InterviewTrends(BaseModel):
    sessions: list[dict]  # [{date, avg_score, turn_count}]
    overall_average: float
    total_sessions: int
    improvement_trend: str  # 'improving', 'stable', 'declining'


@router.get("/history", response_model=list[SessionListItem])
def list_interview_sessions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """List all interview sessions for the current user."""
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == s.id).all()
        avg_score = sum(t.score for t in turns) / len(turns) if turns else None
        result.append(SessionListItem(
            id=s.id,
            status=s.status,
            current_difficulty=s.current_difficulty,
            created_at=s.created_at.isoformat(),
            turn_count=len(turns),
            average_score=round(avg_score, 1) if avg_score else None,
        ))
    return result


@router.get("/trends", response_model=InterviewTrends)
def get_interview_trends(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get aggregated interview score trends."""
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id, InterviewSession.status == 'completed')
        .order_by(InterviewSession.created_at.asc())
        .all()
    )
    session_data = []
    scores = []
    for s in sessions:
        turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == s.id).all()
        if turns:
            avg = sum(t.score for t in turns) / len(turns)
            scores.append(avg)
            session_data.append({
                "date": s.created_at.isoformat(),
                "avg_score": round(avg, 1),
                "turn_count": len(turns),
            })

    overall_avg = round(sum(scores) / len(scores), 1) if scores else 0.0

    # Simple trend: compare first half average to second half
    trend = "stable"
    if len(scores) >= 4:
        mid = len(scores) // 2
        first_half = sum(scores[:mid]) / mid
        second_half = sum(scores[mid:]) / (len(scores) - mid)
        if second_half > first_half + 0.3:
            trend = "improving"
        elif second_half < first_half - 0.3:
            trend = "declining"

    return InterviewTrends(
        sessions=session_data,
        overall_average=overall_avg,
        total_sessions=len(sessions),
        improvement_trend=trend,
    )


@router.post("/start", response_model=InterviewStartResponse)
def start_interview(
    req: InterviewStartRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    resume = db.query(Document).filter(
        Document.id == req.resume_document_id,
        Document.user_id == user_id,
    ).first()
    jd = db.query(Document).filter(
        Document.id == req.jd_document_id,
        Document.user_id == user_id,
    ).first()

    if not resume or resume.status != 'ready':
        raise HTTPException(status_code=400, detail="Resume not found or not ready")
    if not jd or jd.status != 'ready':
        raise HTTPException(status_code=400, detail="Job description not found or not ready")

    resume_chunks = get_document_chunks(req.resume_document_id)
    jd_chunks = get_document_chunks(req.jd_document_id)

    opening_q = generate_opening_question(resume_chunks, jd_chunks)

    session = InterviewSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        resume_document_id=req.resume_document_id,
        jd_document_id=req.jd_document_id,
        status='active',
        current_difficulty='intermediate',
        current_question=opening_q,
    )
    db.add(session)
    db.commit()

    return InterviewStartResponse(
        session_id=session.id,
        opening_question=opening_q,
        difficulty_level=session.current_difficulty,
    )


@router.post("/{session_id}/turn", response_model=InterviewTurnResponse)
def submit_turn(
    session_id: str,
    req: InterviewTurnRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.status != 'active':
        raise HTTPException(status_code=400, detail="Interview session is already completed")

    turns = db.query(InterviewTurn).filter(
        InterviewTurn.session_id == session_id
    ).order_by(InterviewTurn.turn_number).all()
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
        difficulty=answered_difficulty,
    )

    next_difficulty = decide_next_difficulty(
        current_difficulty=answered_difficulty,
        score=evaluation["score"],
        escalation_threshold=settings.DIFFICULTY_ESCALATION_THRESHOLD,
        pivot_threshold=settings.DIFFICULTY_PIVOT_THRESHOLD,
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
            "score": evaluation["score"],
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
        weaknesses=json.dumps(evaluation["weaknesses"]),
    )
    db.add(turn)
    db.commit()

    return InterviewTurnResponse(
        turn_number=turn_number,
        evaluation=EvaluationSchema(**evaluation),
        next_question=next_q,
        difficulty_level=next_difficulty,
        is_session_complete=is_complete,
    )


@router.get("/{session_id}/report", response_model=InterviewReportResponse)
def get_report(
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

    turns = db.query(InterviewTurn).filter(
        InterviewTurn.session_id == session_id
    ).order_by(InterviewTurn.turn_number).all()

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

    return InterviewReportResponse(
        session_id=session_id,
        total_turns=len(turns),
        average_score=report.get("average_score", 0),
        difficulty_progression=report.get("difficulty_progression", []),
        topic_coverage=report.get("topic_coverage", []),
        strengths=report.get("strengths", []),
        weaknesses=report.get("weaknesses", []),
        suggestions=report.get("suggestions", []),
        turns=turn_dicts,
    )
