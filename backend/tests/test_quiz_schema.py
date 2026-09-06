import pytest
from pydantic import ValidationError
from app.schemas import QuizQuestionSchema, CourseResponse, ModuleSchema

def test_quiz_question_has_source_chunk_id():
    """Every quiz question MUST have a non-empty source_chunk_id (grounding guarantee)."""
    data = {
        "id": "q1",
        "question": "What is Python?",
        "options": '["A language", "A snake"]',
        "correct_answer": "A language",
        "explanation": "...",
        "source_chunk_id": "chunk_001"
    }
    obj = QuizQuestionSchema(**data)
    assert obj.source_chunk_id == "chunk_001"
    assert isinstance(obj.options, list)

def test_course_schema_roundtrip():
    """Full course JSON matches the expected Pydantic schema."""
    data = {
        "id": "c1",
        "document_id": "d1",
        "title": "Course 1",
        "status": "ready",
        "error_message": None,
        "created_at": "2023-10-01T12:00:00Z",
        "modules": [
            {
                "id": "m1",
                "title": "Mod 1",
                "summary": "...",
                "order_index": 0,
                "source_chunk_ids": '["chunk_001"]',
                "quiz_questions": [
                    {
                        "id": "q1",
                        "question": "Q?",
                        "options": '["A", "B"]',
                        "correct_answer": "A",
                        "explanation": "E",
                        "source_chunk_id": "chunk_001"
                    }
                ],
                "cheatsheet_bullets": [
                    {
                        "text": "B1",
                        "order_index": 0
                    }
                ]
            }
        ]
    }
    
    course = CourseResponse(**data)
    assert course.id == "c1"
    assert len(course.modules) == 1
    assert course.modules[0].source_chunk_ids == ["chunk_001"]
    
def test_quiz_question_rejects_missing_source_chunk():
    """Schema rejects quiz questions without source_chunk_id."""
    data = {
        "id": "q1",
        "question": "What is Python?",
        "options": '["A language", "A snake"]',
        "correct_answer": "A language",
        "explanation": "..."
    }
    with pytest.raises(ValidationError):
        QuizQuestionSchema(**data)
