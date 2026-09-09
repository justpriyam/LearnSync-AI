from datetime import datetime
from sqlalchemy import ForeignKey, String, Integer, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String, primary_key=True)  # Google sub ID
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Document(Base):
    __tablename__ = 'documents'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey('users.id'), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String)
    file_path: Mapped[str] = mapped_column(String)
    doc_type: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    chunk_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class Course(Base):
    __tablename__ = 'courses'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey('users.id'), nullable=True, index=True)
    document_id: Mapped[str] = mapped_column(String, ForeignKey('documents.id'))
    title: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    modules: Mapped[list["Module"]] = relationship("Module", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = 'modules'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    course_id: Mapped[str] = mapped_column(String, ForeignKey('courses.id'))
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(String)
    order_index: Mapped[int] = mapped_column(Integer)
    source_chunk_ids: Mapped[str] = mapped_column(Text)  # JSON string

    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    quiz_questions: Mapped[list["QuizQuestion"]] = relationship("QuizQuestion", back_populates="module", cascade="all, delete-orphan")
    cheatsheet_bullets: Mapped[list["CheatSheetBullet"]] = relationship("CheatSheetBullet", back_populates="module", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = 'quiz_questions'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    module_id: Mapped[str] = mapped_column(String, ForeignKey('modules.id'))
    question: Mapped[str] = mapped_column(String)
    options: Mapped[str] = mapped_column(Text)  # JSON string
    correct_answer: Mapped[str] = mapped_column(String)
    explanation: Mapped[str] = mapped_column(String)
    source_chunk_id: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer)

    module: Mapped["Module"] = relationship("Module", back_populates="quiz_questions")


class CheatSheetBullet(Base):
    __tablename__ = 'cheatsheet_bullets'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    module_id: Mapped[str] = mapped_column(String, ForeignKey('modules.id'))
    text: Mapped[str] = mapped_column(String)
    order_index: Mapped[int] = mapped_column(Integer)

    module: Mapped["Module"] = relationship("Module", back_populates="cheatsheet_bullets")


class SprintPlan(Base):
    __tablename__ = 'sprint_plans'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey('users.id'), nullable=True, index=True)
    syllabus_document_id: Mapped[str] = mapped_column(String, ForeignKey('documents.id'))
    pyq_document_id: Mapped[str] = mapped_column(String, ForeignKey('documents.id'))
    course_id: Mapped[str] = mapped_column(String, ForeignKey('courses.id'))
    deadline: Mapped[str] = mapped_column(String)  # ISO date string
    total_days: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String)  # 'pending', 'generating', 'ready', 'failed'
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    topics: Mapped[list["SprintTopic"]] = relationship("SprintTopic", back_populates="sprint_plan", cascade="all, delete-orphan")


class SprintTopic(Base):
    __tablename__ = 'sprint_topics'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    sprint_plan_id: Mapped[str] = mapped_column(String, ForeignKey('sprint_plans.id'))
    module_id: Mapped[str] = mapped_column(String, ForeignKey('modules.id'))  # references Phase 1 module
    topic_title: Mapped[str] = mapped_column(String)
    pyq_frequency: Mapped[int] = mapped_column(Integer)  # how many PYQ chunks matched
    similarity_score: Mapped[float] = mapped_column(Float)  # average similarity score
    priority_rank: Mapped[int] = mapped_column(Integer)  # 1 = highest priority
    assigned_day: Mapped[int] = mapped_column(Integer)  # which day of the sprint (1-indexed)
    is_low_priority: Mapped[bool] = mapped_column(Integer, default=False)  # SQLite doesn't have bool

    sprint_plan: Mapped["SprintPlan"] = relationship("SprintPlan", back_populates="topics")


class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey('users.id'), nullable=True, index=True)
    resume_document_id: Mapped[str] = mapped_column(String, ForeignKey('documents.id'))
    jd_document_id: Mapped[str] = mapped_column(String, ForeignKey('documents.id'))
    status: Mapped[str] = mapped_column(String)  # 'active', 'completed'
    current_difficulty: Mapped[str] = mapped_column(String, default='intermediate')  # 'foundational', 'intermediate', 'advanced'
    current_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    turns: Mapped[list["InterviewTurn"]] = relationship("InterviewTurn", back_populates="session", cascade="all, delete-orphan")


class InterviewTurn(Base):
    __tablename__ = 'interview_turns'
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey('interview_sessions.id'))
    turn_number: Mapped[int] = mapped_column(Integer)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer)  # 1-5
    feedback: Mapped[str] = mapped_column(Text)
    difficulty_level: Mapped[str] = mapped_column(String)
    strengths: Mapped[str] = mapped_column(Text, default='[]')  # JSON
    weaknesses: Mapped[str] = mapped_column(Text, default='[]')  # JSON
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    session: Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="turns")
