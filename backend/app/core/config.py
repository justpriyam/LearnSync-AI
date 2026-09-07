import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./learnsync.db"
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    CHROMA_DATA_DIR: str = ".chroma_data"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://frontend-six-omega-55.vercel.app"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_MODEL: str = "gemini-2.0-flash"
    TOP_K_CHUNKS: int = 8
    MAX_LLM_RETRIES: int = 3
    LLM_RETRY_DELAY_SECONDS: float = 2.0
    QUESTIONS_PER_MODULE: int = 5
    CHEATSHEET_BULLETS_PER_MODULE: int = 7
    MAX_UPLOAD_SIZE_MB: int = 50
    GEMINI_MAX_OUTPUT_TOKENS: int = 8192
    GROQ_MAX_TOKENS: int = 4096
    CHROMA_COLLECTION_PREFIX: str = "learnsync_doc_"
    SIMILARITY_THRESHOLD: float = 0.4
    LOW_PRIORITY_FREQUENCY_THRESHOLD: int = 1
    MAX_INTERVIEW_TURNS: int = 10
    DIFFICULTY_ESCALATION_THRESHOLD: int = 4  # score >= this -> harder question
    DIFFICULTY_PIVOT_THRESHOLD: int = 2  # score <= this -> foundational question
    INTERVIEW_GROQ_MODEL: str = "llama-3.3-70b-versatile"  # fast model for interview turns

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
