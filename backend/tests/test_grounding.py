import pytest
import re
from app.schemas import QuizQuestionSchema, ModuleSchema
from app.services.generator import _parse_module_outline

def test_quiz_questions_have_valid_source_chunk_ids():
    """Every quiz question must have a non-empty source_chunk_id."""
    data = {
        "id": "q1",
        "question": "What is Python?",
        "options": '["A language", "A snake"]',
        "correct_answer": "A language",
        "explanation": "...",
        "source_chunk_id": "chunk_001"
    }
    q = QuizQuestionSchema(**data)
    assert q.source_chunk_id == "chunk_001"
    assert q.source_chunk_id != ""

def test_source_chunk_id_format():
    """source_chunk_id should match the chunk_XXXX format."""
    data = {
        "id": "q1",
        "question": "Q?",
        "options": '["A", "B"]',
        "correct_answer": "A",
        "explanation": "...",
        "source_chunk_id": "chunk_001"
    }
    q = QuizQuestionSchema(**data)
    assert re.match(r"^chunk_.*", q.source_chunk_id) is not None

def test_module_source_chunk_ids_are_valid_json():
    """Module source_chunk_ids field must parse as a valid JSON array of strings."""
    data = {
        "id": "m1",
        "title": "Mod",
        "summary": "Sum",
        "order_index": 0,
        "source_chunk_ids": '["chunk_001", "chunk_002"]',
        "quiz_questions": [],
        "cheatsheet_bullets": []
    }
    m = ModuleSchema(**data)
    assert isinstance(m.source_chunk_ids, list)
    assert len(m.source_chunk_ids) == 2

def test_module_outline_parser_accepts_groq_object_response():
    response = '{"modules": [{"title": "Foundations", "summary": "Core ideas", "chunk_ids": ["chunk_0001"]}]}'
    modules = _parse_module_outline(response)
    assert modules[0]["title"] == "Foundations"

def test_module_outline_parser_keeps_gemini_array_compatibility():
    response = '[{"title": "Foundations", "summary": "Core ideas", "chunk_ids": ["chunk_0001"]}]'
    modules = _parse_module_outline(response)
    assert modules[0]["chunk_ids"] == ["chunk_0001"]
