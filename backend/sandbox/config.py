"""
LearnSync AI — Phase 0 Sandbox Configuration

All magic numbers and provider settings live here.
Override via .env file or environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the sandbox directory
_SANDBOX_DIR = Path(__file__).parent
load_dotenv(_SANDBOX_DIR / ".env")

# ─── API Keys ────────────────────────────────────────────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ─── Chunking ────────────────────────────────────────────────────────────────
CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))

# ─── ChromaDB ────────────────────────────────────────────────────────────────
CHROMA_PERSIST_DIR: str = os.getenv(
    "CHROMA_PERSIST_DIR", str(_SANDBOX_DIR / ".chroma_data")
)
CHROMA_COLLECTION_NAME: str = "learnsync_sandbox"

# ─── Embedding ───────────────────────────────────────────────────────────────
# Using ChromaDB's default embedding (all-MiniLM-L6-v2) — free, local, no key.
# No config needed; ChromaDB handles it automatically.

# ─── LLM — Gemini (module outline / heavy reasoning) ────────────────────────
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_MAX_OUTPUT_TOKENS: int = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192"))

# ─── LLM — Groq (quiz + cheatsheet generation / fast inference) ─────────────
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_MAX_TOKENS: int = int(os.getenv("GROQ_MAX_TOKENS", "4096"))

# ─── Retrieval ───────────────────────────────────────────────────────────────
TOP_K_CHUNKS: int = int(os.getenv("TOP_K_CHUNKS", "8"))

# ─── Retry / resilience ─────────────────────────────────────────────────────
MAX_LLM_RETRIES: int = int(os.getenv("MAX_LLM_RETRIES", "3"))
LLM_RETRY_DELAY_SECONDS: float = float(os.getenv("LLM_RETRY_DELAY_SECONDS", "2.0"))

# ─── Upload constraints (used in Phase 1+, defined here for consistency) ────
MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))

# ─── Quiz generation ────────────────────────────────────────────────────────
QUESTIONS_PER_MODULE: int = int(os.getenv("QUESTIONS_PER_MODULE", "5"))
CHEATSHEET_BULLETS_PER_MODULE: int = int(
    os.getenv("CHEATSHEET_BULLETS_PER_MODULE", "7")
)
