from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
import json

class DocumentResponse(BaseModel):
    id: str
    filename: str
    doc_type: str
    status: str
    error_message: str | None = None
    chunk_count: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    error_message: str | None = None
    chunk_count: int | None = None
    model_config = ConfigDict(from_attributes=True)

class TextDocumentRequest(BaseModel):
    filename: str = "job-description.txt"
    text: str

class TopicCourseRequest(BaseModel):
    topic_name: str
    depth: str = 'intermediate'  # beginner, intermediate, advanced

class TopicSprintRequest(BaseModel):
    topic_name: str
    deadline: str  # ISO date
    hours_per_day: int = 4

class QuizQuestionSchema(BaseModel):
    id: str
    question: str
    options: list[str]
    correct_answer: str
    explanation: str
    source_chunk_id: str
    
    @field_validator('options', mode='before')
    def parse_options(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v
        
    model_config = ConfigDict(from_attributes=True)

class CheatSheetBulletSchema(BaseModel):
    text: str
    order_index: int
    model_config = ConfigDict(from_attributes=True)

class ModuleSchema(BaseModel):
    id: str
    title: str
    summary: str
    lesson_content: str | None = None
    youtube_links: str | None = None
    order_index: int
    source_chunk_ids: list[str]
    quiz_questions: list[QuizQuestionSchema]
    cheatsheet_bullets: list[CheatSheetBulletSchema]

    @field_validator('source_chunk_ids', mode='before')
    def parse_source_chunk_ids(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = ConfigDict(from_attributes=True)

class CourseResponse(BaseModel):
    id: str
    document_id: str
    title: str
    status: str
    error_message: str | None = None
    created_at: datetime
    modules: list[ModuleSchema]
    model_config = ConfigDict(from_attributes=True)

class CourseStatusResponse(BaseModel):
    id: str
    status: str
    error_message: str | None = None
    model_config = ConfigDict(from_attributes=True)

class SprintGenerateRequest(BaseModel):
    syllabus_document_id: str
    pyq_document_id: str
    deadline: str  # ISO date string e.g. "2026-09-10"
    available_hours_per_day: int = 2
    attachment_name: str | None = None
    attachment_size: int | None = None

class SprintTopicSchema(BaseModel):
    id: str
    module_id: str
    topic_title: str
    pyq_frequency: int
    similarity_score: float
    priority_rank: int
    assigned_day: int
    is_low_priority: bool
    model_config = ConfigDict(from_attributes=True)

class SprintPlanResponse(BaseModel):
    id: str
    syllabus_document_id: str
    pyq_document_id: str
    course_id: str
    deadline: str
    total_days: int
    status: str
    error_message: str | None = None
    created_at: datetime
    topics: list[SprintTopicSchema]
    model_config = ConfigDict(from_attributes=True)

class SprintPlanStatusResponse(BaseModel):
    id: str
    status: str
    error_message: str | None = None
    model_config = ConfigDict(from_attributes=True)

class InterviewStartRequest(BaseModel):
    resume_document_id: str
    jd_document_id: str

class InterviewStartResponse(BaseModel):
    session_id: str
    opening_question: str
    difficulty_level: str

class InterviewTurnRequest(BaseModel):
    answer_text: str

class EvaluationSchema(BaseModel):
    score: int  # 1-5
    feedback: str
    strengths: list[str]
    weaknesses: list[str]

class InterviewTurnResponse(BaseModel):
    turn_number: int
    evaluation: EvaluationSchema
    next_question: str | None
    difficulty_level: str
    is_session_complete: bool

class InterviewTurnDetail(BaseModel):
    turn_number: int
    question: str
    answer: str
    score: int
    feedback: str
    difficulty_level: str
    model_config = ConfigDict(from_attributes=True)

class TopicCoverage(BaseModel):
    topic: str
    score: float

class InterviewReportResponse(BaseModel):
    session_id: str
    total_turns: int
    average_score: float
    difficulty_progression: list[str]
    topic_coverage: list[TopicCoverage]
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    turns: list[InterviewTurnDetail]
