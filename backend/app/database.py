# Re-export for backward compatibility
from app.db.database import (
    Base,
    engine,
    SessionLocal,
    get_db,
    init_db,
    get_engine_and_url,
)

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
    "get_engine_and_url",
]
