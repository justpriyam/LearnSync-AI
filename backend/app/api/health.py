from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db

router = APIRouter(tags=["health"])

@router.get("/health")
@router.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint to verify API and database liveness.

    Used by frontend on load to warm up Render free-tier cold starts.
    """
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "learnsync-api",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
