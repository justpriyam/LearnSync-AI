from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.courses import router as courses_router
from app.api.sprint import router as sprint_router
from app.api.interview import router as interview_router
from app.api.deletion import router as deletion_router

__all__ = [
    "health_router",
    "documents_router",
    "courses_router",
    "sprint_router",
    "interview_router",
    "deletion_router",
]
