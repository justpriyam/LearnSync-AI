import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Document, Course, Module, QuizQuestion, CheatSheetBullet, InterviewSession, InterviewTurn
from datetime import datetime

# Setup in-memory sqlite DB for tests
engine = create_engine("sqlite:///:memory:", echo=False)
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
def test_document_deletion_removes_all_artifacts(db):
    """Deleting a document should cascade to courses, modules, quizzes, cheatsheets."""
    # Create test data in DB
    doc = Document(id="doc1", filename="test.pdf", file_path="/tmp/test.pdf", doc_type="syllabus", status="ready")
    db.add(doc)
    db.commit()
    
    course = Course(id="c1", document_id="doc1", title="Test Course", status="ready")
    db.add(course)
    db.commit()
    
    module = Module(id="m1", course_id="c1", title="Test Mod", summary="...", order_index=0, source_chunk_ids="[]")
    db.add(module)
    db.commit()
    
    quiz = QuizQuestion(id="q1", module_id="m1", question="Q?", options="[]", correct_answer="A", explanation="E", source_chunk_id="chunk1", order_index=0)
    db.add(quiz)
    
    bullet = CheatSheetBullet(id="b1", module_id="m1", text="T", order_index=0)
    db.add(bullet)
    db.commit()
    
    # Call the router function directly to test its cascading logic
    from app.routers.deletion import delete_document
    delete_document("doc1", db)
    
    # Verify all related rows are gone
    assert db.query(Document).filter_by(id="doc1").first() is None
    assert db.query(Course).filter_by(id="c1").first() is None
    assert db.query(Module).filter_by(id="m1").first() is None
    assert db.query(QuizQuestion).filter_by(id="q1").first() is None
    assert db.query(CheatSheetBullet).filter_by(id="b1").first() is None

def test_interview_deletion_removes_turns(db):
    """Deleting an interview session should cascade to all turns."""
    # Insert documents first because of foreign keys
    doc1 = Document(id="res1", filename="resume.pdf", file_path="/tmp/r.pdf", doc_type="resume", status="ready")
    doc2 = Document(id="jd1", filename="jd.pdf", file_path="/tmp/j.pdf", doc_type="jd", status="ready")
    db.add_all([doc1, doc2])
    db.commit()
    
    session = InterviewSession(id="sess1", resume_document_id="res1", jd_document_id="jd1", status="active", current_difficulty="intermediate")
    db.add(session)
    db.commit()
    
    turn = InterviewTurn(id="t1", session_id="sess1", turn_number=1, question="Q1", answer="A1", score=5, feedback="F", difficulty_level="intermediate")
    db.add(turn)
    db.commit()
    
    # Call delete
    db.delete(session)
    db.commit()
    
    # Verify
    assert db.query(InterviewSession).filter_by(id="sess1").first() is None
    assert db.query(InterviewTurn).filter_by(id="t1").first() is None
