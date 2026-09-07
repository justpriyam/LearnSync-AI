from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.core.config import settings
from app.api import (
    health_router,
    documents_router,
    courses_router,
    sprint_router,
    interview_router,
    deletion_router,
)

app = FastAPI(
    title="LearnSync AI API",
    description="AI-powered course engine, exam sprint planner & mock interview mentor API",
    version="1.0.0",
)

# Parse allowed origins from config
allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

# CORS middleware with preview Vercel deployment regex matching
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers
app.include_router(health_router, prefix="", tags=["health"])
app.include_router(documents_router, prefix="", tags=["documents"])
app.include_router(courses_router, prefix="", tags=["courses"])
app.include_router(sprint_router, prefix="", tags=["sprint"])
app.include_router(interview_router, prefix="", tags=["interview"])
app.include_router(deletion_router, prefix="", tags=["admin"])
