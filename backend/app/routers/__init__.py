from app.api.documents import router as documents
from app.api.courses import router as courses
from app.api.sprint import router as sprint
from app.api.interview import router as interview
from app.api.deletion import router as deletion

__all__ = ["documents", "courses", "sprint", "interview", "deletion"]
